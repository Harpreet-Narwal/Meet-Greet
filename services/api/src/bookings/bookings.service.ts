import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Booking, Event, Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { getPaymentProvider } from "../payments/payment-provider";
import {
  FULL_CREDIT_WINDOW_HOURS,
  PENDING_EXPIRY_MINUTES,
  type TwoTruthsDto,
} from "./bookings.types";

/** Statuses that hold a seat. Waitlisted/cancelled/refunded/no_show don't. */
const SEAT_HOLDING = ["pending_payment", "confirmed", "checked_in"] as const;

export interface BookingView {
  id: string;
  status: Booking["status"];
  amount_inr: number;
  two_truths_submitted: boolean;
  event: {
    id: string;
    slug: string;
    title: string;
    type: Event["type"];
    starts_at: string;
    status: Event["status"];
    neighborhood_teaser: string | null;
  };
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private readonly provider = getPaymentProvider();

  constructor(private readonly prisma: PrismaService) {}

  private toView(booking: Booking & { event: Event }): BookingView {
    return {
      id: booking.id,
      status: booking.status,
      amount_inr: booking.amountInr,
      two_truths_submitted: booking.twoTruths !== null,
      event: {
        id: booking.event.id,
        slug: booking.event.slug,
        title: booking.event.title,
        type: booking.event.type,
        starts_at: booking.event.startsAt.toISOString(),
        status: booking.event.status,
        neighborhood_teaser: booking.event.neighborhoodTeaser,
      },
    };
  }

  /**
   * Book a seat. Capacity is enforced inside a transaction with a
   * SELECT … FOR UPDATE on the event row — the oversell race test in
   * test/booking-race.e2e-spec.ts proves this holds under concurrency.
   * Full event → waitlisted. No payment → no seat (expiry job).
   */
  async book(userId: string, eventId: string): Promise<BookingView> {
    const created = await this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<{ id: string; capacity: number; status: string; starts_at: Date; price_inr: number; women_only: boolean }[]>`
          SELECT id, capacity, status, starts_at, price_inr, women_only
          FROM events WHERE id = ${eventId}::uuid FOR UPDATE`;
        const event = rows[0];
        if (!event) throw new NotFoundException("no such event");
        if (!["published", "revealed", "live"].includes(event.status)) {
          throw new BadRequestException("this table isn't taking bookings");
        }
        if (event.starts_at.getTime() < Date.now()) {
          throw new BadRequestException("that evening has already happened");
        }
        if (event.women_only) {
          const user = await tx.user.findUnique({ where: { id: userId } });
          if (user?.gender !== "woman") {
            throw new BadRequestException("this is a women-only table");
          }
        }

        const existing = await tx.booking.findUnique({
          where: { userId_eventId: { userId, eventId } },
        });
        if (existing && !["cancelled", "refunded"].includes(existing.status)) {
          throw new ConflictException("you already have a seat at this table");
        }

        const taken = await tx.booking.count({
          where: { eventId, status: { in: [...SEAT_HOLDING] } },
        });
        const status = taken < event.capacity ? "pending_payment" : "waitlisted";

        const data: Prisma.BookingUncheckedCreateInput = {
          userId,
          eventId,
          status,
          amountInr: event.price_inr,
        };
        if (existing) {
          return tx.booking.update({
            where: { id: existing.id },
            data: { status, amountInr: event.price_inr, twoTruths: undefined },
            include: { event: true },
          });
        }
        return tx.booking.create({ data, include: { event: true } });
      },
      { isolationLevel: "ReadCommitted" },
    );

    if (created.status === "pending_payment") {
      return this.toView(await this.collectPayment(created.id, created.amountInr));
    }
    return this.toView(created);
  }

  /** Create the payment order; the mock provider auto-succeeds → confirmed. */
  private async collectPayment(
    bookingId: string,
    amountInr: number,
  ): Promise<Booking & { event: Event }> {
    if (amountInr === 0) {
      // Free formats (run clubs): no order, straight to confirmed.
      return this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: "confirmed" },
        include: { event: true },
      });
    }
    const order = await this.provider.createOrder(amountInr, bookingId);
    await this.prisma.payment.create({
      data: {
        bookingId,
        provider: order.provider,
        providerOrderId: order.provider_order_id,
        amountInr,
        status: order.auto_paid ? "paid" : "created",
        raw: {},
      },
    });
    if (order.auto_paid) {
      return this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: "confirmed" },
        include: { event: true },
      });
    }
    return this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { event: true },
    });
  }

  /** Provider webhook (real providers). Mock flows never need it but it works. */
  async handleWebhook(providerOrderId: string, outcome: "paid" | "failed"): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId },
      include: { booking: true },
    });
    if (!payment || !payment.bookingId) throw new NotFoundException("unknown order");
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: outcome },
    });
    if (outcome === "paid" && payment.booking?.status === "pending_payment") {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: "confirmed" },
      });
    }
  }

  async myBookings(userId: string): Promise<{ upcoming: BookingView[]; past: BookingView[] }> {
    const bookings = await this.prisma.booking.findMany({
      where: { userId, status: { notIn: ["cancelled", "refunded"] } },
      include: { event: true },
      orderBy: { event: { startsAt: "asc" } },
    });
    const now = Date.now();
    return {
      upcoming: bookings.filter((b) => b.event.startsAt.getTime() >= now).map((b) => this.toView(b)),
      past: bookings.filter((b) => b.event.startsAt.getTime() < now).map((b) => this.toView(b)).reverse(),
    };
  }

  async submitTwoTruths(userId: string, bookingId: string, dto: TwoTruthsDto): Promise<BookingView> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: true },
    });
    if (!booking || booking.userId !== userId) throw new NotFoundException("no such booking");
    if (!["confirmed", "checked_in", "waitlisted", "pending_payment"].includes(booking.status)) {
      throw new BadRequestException("this booking isn't active");
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { twoTruths: { truths: dto.truths, lie: dto.lie } },
      include: { event: true },
    });
    return this.toView(updated);
  }

  /** Cancel. >48h before start → full credit (refunded); else cancelled. */
  async cancel(userId: string, bookingId: string): Promise<BookingView> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: true },
    });
    if (!booking || booking.userId !== userId) throw new NotFoundException("no such booking");
    if (["cancelled", "refunded", "checked_in", "no_show"].includes(booking.status)) {
      throw new BadRequestException("this booking can't be cancelled");
    }
    const hoursToStart = (booking.event.startsAt.getTime() - Date.now()) / 3600000;
    const nextStatus = hoursToStart > FULL_CREDIT_WINDOW_HOURS ? "refunded" : "cancelled";
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: nextStatus },
      include: { event: true },
    });
    await this.promoteWaitlist(booking.eventId);
    return this.toView(updated);
  }

  /** Oldest waitlisted booking takes the freed seat (auto-paid on mock). */
  async promoteWaitlist(eventId: string): Promise<void> {
    const promoted = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE`;
      const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      const taken = await tx.booking.count({
        where: { eventId, status: { in: [...SEAT_HOLDING] } },
      });
      if (taken >= event.capacity) return null;
      const next = await tx.booking.findFirst({
        where: { eventId, status: "waitlisted" },
        orderBy: { createdAt: "asc" },
      });
      if (!next) return null;
      return tx.booking.update({
        where: { id: next.id },
        data: { status: "pending_payment" },
      });
    });
    if (promoted) {
      this.logger.log(`waitlist promotion: booking ${promoted.id} got a seat`);
      await this.collectPayment(promoted.id, promoted.amountInr);
    }
  }

  /** Expire unpaid pending bookings (BullMQ, every minute). No payment → no seat. */
  async expireStalePending(): Promise<number> {
    const cutoff = new Date(Date.now() - PENDING_EXPIRY_MINUTES * 60_000);
    const stale = await this.prisma.booking.findMany({
      where: { status: "pending_payment", updatedAt: { lt: cutoff } },
      select: { id: true, eventId: true },
    });
    for (const booking of stale) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: "cancelled" },
      });
      await this.promoteWaitlist(booking.eventId);
    }
    if (stale.length > 0) this.logger.log(`expired ${stale.length} unpaid bookings`);
    return stale.length;
  }
}
