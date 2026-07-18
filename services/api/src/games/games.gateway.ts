import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

import type { JwtPayload } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import {
  initialState,
  reduce,
  toCards,
  type BaseState,
  type DeckKind,
  type GameEvent,
  type Player,
} from "./engines";
import { GameStateStore } from "./game-state.store";

interface SocketUser {
  userId: string;
  role: JwtPayload["role"];
}

function room(tableId: string): string {
  return `table:${tableId}`;
}

/**
 * Socket.IO game-room gateway (plan §6). JWT in the handshake; rooms are
 * table:{table_id}. State lives in Redis; every join gets a full room:state
 * snapshot so reconnects (and refreshes) resume seamlessly.
 */
@WebSocketGateway({ namespace: "/games", cors: { origin: true, credentials: true } })
export class GamesGateway implements OnGatewayConnection {
  private readonly logger = new Logger(GamesGateway.name);
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly store: GameStateStore,
  ) {}

  private auth(client: Socket): SocketUser | null {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.headers.authorization?.replace("Bearer ", "") as string | undefined);
    if (!token) return null;
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      if (payload.type !== "access") return null;
      return { userId: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket): void {
    if (!this.auth(client)) {
      client.emit("error:auth", { message: "invalid or missing token" });
      client.disconnect(true);
    }
  }

  /** Attendee (checked-in) or host joins the table room. */
  @SubscribeMessage("room:join")
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { table_id: string },
  ): Promise<void> {
    const user = this.auth(client);
    if (!user) return;
    const allowed = await this.canJoin(user, body.table_id);
    if (!allowed) {
      client.emit("error:join", { message: "you must be checked in at this table" });
      return;
    }
    await client.join(room(body.table_id));

    let state = await this.store.get(body.table_id);
    if (!state) {
      state = initialState(await this.players(body.table_id));
      await this.store.set(body.table_id, state);
    }
    // full snapshot on join/reconnect
    client.emit("room:state", state);
    this.server.to(room(body.table_id)).emit("presence:update", {
      table_id: body.table_id,
    });
  }

  @SubscribeMessage("game:start")
  async onStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { table_id: string; deck_kind: DeckKind; level?: number },
  ): Promise<void> {
    const user = this.auth(client);
    if (!user) return;
    if (!(await this.canJoin(user, body.table_id))) return;

    const deck = await this.pickDeck(body.deck_kind, body.level);
    if (!deck) {
      client.emit("error:start", { message: "no active deck for that game" });
      return;
    }
    let cards = toCards(deck.cards);
    if (body.deck_kind === "two_truths") {
      cards = await this.twoTruthsCards(body.table_id);
      if (cards.length === 0) {
        client.emit("error:start", { message: "no two-truths entries collected yet" });
        return;
      }
    }
    await this.apply(body.table_id, {
      type: "start",
      deckKind: body.deck_kind,
      level: body.level,
      cards,
      startedBy: user.userId,
    });
    this.server.to(room(body.table_id)).emit("game:started", { deck_kind: body.deck_kind });
  }

  @SubscribeMessage("card:advance")
  async onAdvance(@ConnectedSocket() c: Socket, @MessageBody() b: { table_id: string }) {
    if (!this.auth(c)) return;
    await this.apply(b.table_id, { type: "advance" });
  }

  @SubscribeMessage("card:answer")
  async onAnswer(
    @ConnectedSocket() c: Socket,
    @MessageBody() b: { table_id: string; answer: string },
  ) {
    const user = this.auth(c);
    if (!user) return;
    await this.apply(b.table_id, { type: "answer", userId: user.userId, answer: b.answer });
  }

  @SubscribeMessage("vote:cast")
  async onVote(
    @ConnectedSocket() c: Socket,
    @MessageBody() b: { table_id: string; choice: string },
  ) {
    const user = this.auth(c);
    if (!user) return;
    // votes are private until reveal — ack only to the voter, broadcast a count
    await this.apply(b.table_id, { type: "vote", userId: user.userId, choice: b.choice }, () => {
      c.emit("vote:ack", { table_id: b.table_id });
    });
  }

  @SubscribeMessage("level:vote")
  async onLevelVote(
    @ConnectedSocket() c: Socket,
    @MessageBody() b: { table_id: string; level: number },
  ) {
    const user = this.auth(c);
    if (!user) return;
    await this.apply(b.table_id, { type: "levelVote", userId: user.userId, level: b.level });
  }

  @SubscribeMessage("game:end")
  async onEnd(@ConnectedSocket() c: Socket, @MessageBody() b: { table_id: string }) {
    if (!this.auth(c)) return;
    await this.apply(b.table_id, { type: "end" });
  }

  // ── internals ──────────────────────────────────────────────────────────

  /** Apply an event through the pure reducer, persist, broadcast the snapshot. */
  private async apply(
    tableId: string,
    event: GameEvent,
    beforeBroadcast?: () => void,
  ): Promise<void> {
    const current = (await this.store.get(tableId)) ?? initialState(await this.players(tableId));
    const next = reduce(current, event);
    await this.store.set(tableId, next);
    beforeBroadcast?.();
    // broadcast the full snapshot — clients render from state, reconnect-safe
    this.server.to(room(tableId)).emit("room:state", this.publicState(next));
  }

  /** Strip per-voter choices from the broadcast during voting (privacy). */
  private publicState(state: BaseState): BaseState {
    if (state.phase === "voting") {
      return { ...state, votes: {} }; // who-voted-what stays server-side until reveal
    }
    if (state.kind === "most_likely") {
      // even at reveal, most_likely never exposes the vote map
      return { ...state, votes: {} };
    }
    return state;
  }

  private async canJoin(user: SocketUser, tableId: string): Promise<boolean> {
    if (user.role === "host" || user.role === "admin") return true;
    const booking = await this.prisma.booking.findFirst({
      where: { tableId, userId: user.userId, status: "checked_in" },
    });
    return booking !== null;
  }

  private async players(tableId: string): Promise<Player[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { tableId, status: "checked_in" },
      include: { user: { select: { id: true, firstName: true } } },
    });
    return bookings.map((b) => ({
      user_id: b.userId,
      first_name: b.user.firstName ?? "Guest",
    }));
  }

  private async pickDeck(kind: DeckKind, level?: number) {
    return this.prisma.deck.findFirst({
      where: { kind, status: "active", level: kind === "icebreaker" ? (level ?? 1) : undefined },
      include: { cards: { where: { deletedAt: null }, orderBy: { ord: "asc" } } },
    });
  }

  /** two_truths: build a card per attendee from their booking entries. */
  private async twoTruthsCards(tableId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { tableId, status: "checked_in" },
      include: { user: { select: { firstName: true } } },
    });
    const cards: { id: string; text: string; answer: string | null }[] = [];
    for (const b of bookings) {
      const tt = b.twoTruths as { truths?: string[]; lie?: string } | null;
      if (tt?.truths && tt.lie) {
        cards.push({
          id: b.id,
          text: `${b.user.firstName ?? "Someone"}: which is the lie?`,
          answer: tt.lie,
        });
      }
    }
    return cards;
  }
}
