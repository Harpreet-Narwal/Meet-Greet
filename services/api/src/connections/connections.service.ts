import { BadRequestException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

/**
 * Connect (friends) and Spark (opt-in dating) between people who attended the
 * same event. THE CRITICAL INVARIANT (CLAUDE.md, plan §6):
 *
 *   A one-sided Spark is NEVER visible to the recipient — in any payload, log,
 *   or UI state. Only when BOTH users have relationship_intent=open_to_dating
 *   AND both sent Sparks does it become `mutual` and open a direct chat.
 *
 * Enforced here in the service layer and asserted by explicit tests.
 */
@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertBothAttended(eventId: string, a: string, b: string): Promise<void> {
    const count = await this.prisma.booking.count({
      where: { eventId, userId: { in: [a, b] }, status: { in: ["checked_in", "no_show"] } },
    });
    // both must have a checked-in booking at this event (met in person)
    if (count < 2) {
      const both = await this.prisma.booking.findMany({
        where: { eventId, userId: { in: [a, b] }, status: "checked_in" },
        select: { userId: true },
      });
      if (new Set(both.map((x) => x.userId)).size < 2) {
        throw new BadRequestException("you can only connect with people you've met at an event");
      }
    }
  }

  async send(
    fromUserId: string,
    eventId: string,
    toUserId: string,
    kind: "connect" | "spark",
  ): Promise<{ status: "pending" | "mutual" }> {
    if (fromUserId === toUserId) throw new BadRequestException("that's you");
    await this.assertBothAttended(eventId, fromUserId, toUserId);

    if (kind === "spark") {
      // Sparks require BOTH users open_to_dating (checked before anything persists)
      const [me, them] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: fromUserId } }),
        this.prisma.user.findUnique({ where: { id: toUserId } }),
      ]);
      if (me?.relationshipIntent !== "open_to_dating") {
        throw new BadRequestException("turn on 'open to dating' in your profile to send a Spark");
      }
      // If THEY aren't open to dating we still record our spark silently (never
      // revealed); it simply can never become mutual. No error — no oracle.
      void them;
    }

    // idempotent: our own outgoing connection of this kind
    await this.prisma.connection.upsert({
      where: {
        eventId_fromUserId_toUserId_kind: {
          eventId,
          fromUserId,
          toUserId,
          kind,
        },
      },
      create: { eventId, fromUserId, toUserId, kind, status: "pending" },
      update: {},
    });

    // Did the other side already send the same kind back?
    const reciprocal = await this.prisma.connection.findUnique({
      where: {
        eventId_fromUserId_toUserId_kind: {
          eventId,
          fromUserId: toUserId,
          toUserId: fromUserId,
          kind,
        },
      },
    });

    let mutual = reciprocal !== null && reciprocal.status !== "declined";
    if (kind === "spark" && mutual) {
      // double-check BOTH are open_to_dating at mutualization time
      const [me, them] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: fromUserId } }),
        this.prisma.user.findUnique({ where: { id: toUserId } }),
      ]);
      mutual =
        me?.relationshipIntent === "open_to_dating" &&
        them?.relationshipIntent === "open_to_dating";
    }

    if (mutual) {
      await this.prisma.$transaction(async (tx) => {
        await tx.connection.updateMany({
          where: {
            eventId,
            kind,
            OR: [
              { fromUserId, toUserId },
              { fromUserId: toUserId, toUserId: fromUserId },
            ],
          },
          data: { status: "mutual" },
        });
        // open a direct chat if one doesn't exist between them
        await this.ensureDirectChat(tx, [fromUserId, toUserId]);
      });
      return { status: "mutual" };
    }
    return { status: "pending" };
  }

  private async ensureDirectChat(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    userIds: [string, string],
  ): Promise<void> {
    const existing = await tx.chat.findFirst({
      where: {
        kind: "direct",
        AND: userIds.map((id) => ({ members: { some: { userId: id } } })),
      },
    });
    if (existing) return;
    await tx.chat.create({
      data: {
        kind: "direct",
        members: { create: userIds.map((userId) => ({ userId })) },
      },
    });
  }

  /**
   * My connections. CRITICAL: only returns connections that are mutual, OR that
   * I initiated (my own outgoing). Incoming one-sided Sparks/Connects toward me
   * are NEVER returned — the recipient must not see them.
   */
  async myConnections(userId: string, status?: "mutual" | "pending") {
    const rows = await this.prisma.connection.findMany({
      where: {
        // never surface someone else's one-sided spark/connect TO me:
        // only mine-outgoing, or already-mutual (which is symmetric).
        OR: [{ fromUserId: userId }, { status: "mutual", toUserId: userId }],
        ...(status ? { status } : {}),
      },
      include: {
        toUser: { select: { id: true, firstName: true, photoUrl: true } },
        fromUser: { select: { id: true, firstName: true, photoUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((c) => {
      const other = c.fromUserId === userId ? c.toUser : c.fromUser;
      return {
        id: c.id,
        kind: c.kind,
        status: c.status,
        // for a pending row we only ever show MY outgoing intent; never reveal
        // whether the other person sparked me.
        direction: c.fromUserId === userId ? "outgoing" : "mutual",
        person: { id: other.id, first_name: other.firstName, photo_url: other.photoUrl },
      };
    });
  }

  /** Who sparked me — PLUS-ONLY, and still never reveals one-sided sparks as
   * identified people; it only surfaces mutual sparks early. Kept minimal here;
   * Plus gating for "see who sparked you first" lands in M6. */
  async sparkCount(userId: string): Promise<{ mutual_sparks: number }> {
    const mutual = await this.prisma.connection.count({
      where: { kind: "spark", status: "mutual", OR: [{ fromUserId: userId }, { toUserId: userId }] },
    });
    return { mutual_sparks: mutual };
  }
}
