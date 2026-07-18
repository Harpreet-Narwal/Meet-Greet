import { ForbiddenException, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

/** Free tier: 3 Connects per event. Plus: unlimited + see who sparked you first. */
export const FREE_CONNECTS_PER_EVENT = 3;

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async isPlus(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: "active",
        tier: { in: ["plus", "concierge"] },
        currentPeriodEnd: { gt: new Date() },
      },
    });
    return sub !== null;
  }

  async mySubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: "active", currentPeriodEnd: { gt: new Date() } },
      orderBy: { currentPeriodEnd: "desc" },
    });
    return {
      tier: sub?.tier ?? "free",
      status: sub?.status ?? "none",
      current_period_end: sub?.currentPeriodEnd?.toISOString() ?? null,
      benefits: {
        unlimited_connects: sub !== null,
        see_who_sparked_you: sub !== null,
        priority_seats: sub !== null,
      },
    };
  }

  /** Mock-provider subscribe (plan §12: interfaces + mock only). */
  async subscribe(userId: string, tier: "plus" | "concierge") {
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await this.prisma.subscription.create({
      data: {
        userId,
        tier,
        status: "active",
        providerSubId: `mock_sub_${Date.now()}`,
        currentPeriodEnd,
      },
    });
    await this.prisma.payment.create({
      data: {
        provider: "mock",
        providerOrderId: `mock_subpay_${Date.now()}`,
        amountInr: tier === "plus" ? 499 : 1499,
        status: "paid",
        raw: {},
      },
    });
    return this.mySubscription(userId);
  }

  /** SERVER-SIDE Plus gate: free users get FREE_CONNECTS_PER_EVENT per event.
   * Called before recording a connect/spark. Sparks always allowed (dating is
   * not a paid feature); the connects cap is the Plus lever. */
  async assertCanConnect(userId: string, eventId: string): Promise<void> {
    if (await this.isPlus(userId)) return;
    const used = await this.prisma.connection.count({
      where: { fromUserId: userId, eventId, kind: "connect" },
    });
    if (used >= FREE_CONNECTS_PER_EVENT) {
      throw new ForbiddenException(
        `free members get ${FREE_CONNECTS_PER_EVENT} connects per event — upgrade to Plus for unlimited`,
      );
    }
  }

  /**
   * INVARIANT-SAFE by design. The product plan floats "see who Sparked you" as a
   * Plus perk, but revealing a one-sided incoming Spark to its recipient breaks
   * the non-negotiable Spark-privacy invariant (CLAUDE.md) — and you must never
   * paywall around safety. So this ONLY ever returns MUTUAL sparks (both people
   * sparked → already safe to reveal). It never discloses a one-sided spark,
   * Plus or not. The genuine Plus levers are unlimited connects + priority seats.
   */
  async whoSparkedMe(userId: string) {
    if (!(await this.isPlus(userId))) {
      throw new ForbiddenException("this is a Plus benefit");
    }
    const mutual = await this.prisma.connection.findMany({
      where: {
        kind: "spark",
        status: "mutual",
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: {
        fromUser: { select: { id: true, firstName: true, photoUrl: true } },
        toUser: { select: { id: true, firstName: true, photoUrl: true } },
      },
    });
    return {
      // mutual only — a one-sided spark is never present here
      sparked_by: mutual.map((c) => {
        const other = c.fromUserId === userId ? c.toUser : c.fromUser;
        return {
          id: other.id,
          first_name: other.firstName,
          photo_url: other.photoUrl,
          status: "mutual" as const,
        };
      }),
    };
  }
}
