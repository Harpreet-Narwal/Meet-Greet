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
import { ChatService } from "./chat.service";

function room(chatId: string): string {
  return `chat:${chatId}`;
}

/** Realtime chat (plan §8). JWT handshake; rooms are chat:{chat_id}. */
@WebSocketGateway({ namespace: "/chat", cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

  private auth(client: Socket): string | null {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      return payload.type === "access" ? payload.sub : null;
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket): void {
    if (!this.auth(client)) client.disconnect(true);
  }

  @SubscribeMessage("chat:join")
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { chat_id: string }) {
    const userId = this.auth(client);
    if (!userId) return;
    const member = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: body.chat_id, userId } },
    });
    if (!member) {
      client.emit("error:join", { message: "not a member of this chat" });
      return;
    }
    await client.join(room(body.chat_id));
  }

  @SubscribeMessage("chat:send")
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chat_id: string; body: string },
  ) {
    const userId = this.auth(client);
    if (!userId) return;
    try {
      const message = await this.chat.send(userId, body.chat_id, body.body);
      this.server.to(room(body.chat_id)).emit("chat:message", message);
    } catch (error) {
      client.emit("error:send", { message: (error as Error).message });
    }
  }
}
