import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Booking, Event, Prisma } from "@prisma/client";

import { env } from "../config/env";
import { BookingMailService } from "../mail/booking-mail.service";
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
  /**
   * Hosted checkout to open, when the gateway needs one. Null on mock (settled
   * in-app) and on anything already confirmed.
   */
  checkout_url?: string | null;
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingMail: BookingMailService,
  ) {}

  private toView(
    booking: Booking & { event: Event },
    checkoutUrl?: string | null,
  ): BookingView {
    return {
      id: booking.id,
      status: booking.status,
      amount_inr: booking.amountInr,
      two_truths_submitted: booking.twoTruths !== null,
      checkout_url: checkoutUrl ?? null,
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
        const rows = await tx.$queryRaw<{ id: string; capacity: number; status: string; starts_at: Date; price_inr: number; women_only: boolean; men_only: boolean }[]>`
          SELECT id, capacity, status, starts_at, price_inr, women_only, men_only
          FROM events WHERE id = ${eventId}::uuid FOR UPDATE`;
        const event = rows[0];
        if (!event) throw new NotFoundException("no such event");
        if (!["published", "revealed", "live"].includes(event.status)) {
          throw new BadRequestException("this table isn't taking bookings");
        }
        if (event.starts_at.getTime() < Date.now()) {
          throw new BadRequestException("that evening has already happened");
        }
        // Gender-restricted tables. Note the null case: gender is optional on
        // the user record, and an unset gender must be told to go set it rather
        // than be given the flat "this is a women-only table" refusal — that
        // reads as "you are the wrong gender" to someone who simply never
        // answered.
        if (event.women_only || event.men_only) {
          const user = await tx.user.findUnique({ where: { id: userId } });
          const wanted = event.women_only ? "woman" : "man";
          const label = event.women_only ? "women-only" : "men-only";
          if (!user?.gender || user.gender === "prefer_not") {
            throw new BadRequestException(
              `add your gender to your profile to book a ${label} table`,
            );
          }
          if (user.gender !== wanted) {
            throw new BadRequestException(`this is a ${label} table`);
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
      const { booking, checkoutUrl } = await this.collectPayment(created.id, created.amountInr);
      return this.toView(booking, checkoutUrl);
    }
    return this.toView(created);
  }

  /**
   * Create the payment order.
   *
   * Returns the checkout URL separately from the booking row because it is not
   * persisted state — it belongs to this one attempt, and a real gateway's link
   * expires. Only the caller that created it hands it to the client.
   */
  private async collectPayment(
    bookingId: string,
    amountInr: number,
  ): Promise<{ booking: Booking & { event: Event }; checkoutUrl: string | null }> {
    if (amountInr === 0) {
      // Free formats (run clubs): no order, straight to confirmed.
      const free = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: "confirmed" },
        include: { event: true },
      });
      await this.bookingMail.sendConfirmation(free.id);
      return { booking: free, checkoutUrl: null };
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
      const paid = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: "confirmed" },
        include: { event: true },
      });
      return { booking: paid, checkoutUrl: null };
    }
    return {
      booking: await this.prisma.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: { event: true },
      }),
      checkoutUrl: order.checkout_url ?? null,
    };
  }

  /**
   * Settle a mock checkout: the dev-build equivalent of the customer completing
   * payment at the gateway. Guarded to the mock provider so this can never be
   * used to mark a real order paid, and scoped to the caller's own booking.
   */
  async payMock(userId: string, bookingId: string): Promise<BookingView> {
    if (env.PAYMENT_PROVIDER !== "mock") {
      throw new BadRequestException("checkout settlement is only available on the mock provider");
    }
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: { event: true },
    });
    if (!booking) throw new NotFoundException("booking not found");
    if (booking.status === "confirmed" || booking.status === "checked_in") {
      return this.toView(booking);
    }
    if (booking.status !== "pending_payment") {
      throw new BadRequestException("this booking is not awaiting payment");
    }
    await this.prisma.payment.updateMany({
      where: { bookingId, status: "created" },
      data: { status: "paid" },
    });
    const confirmed = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed" },
      include: { event: true },
    });
    await this.ensureTableChat(userId, confirmed.eventId);
    await this.bookingMail.sendConfirmation(confirmed.id);
    return this.toView(confirmed);
  }

  /**
   * Dev affordance: put a paid guest into their table's group chat straight
   * away, so the Chats surface has something real in it before an event has
   * actually run. In production this chat opens after the night (T+2h debrief)
   * — hence the mock-provider guard on the only caller.
   */
  private async ensureTableChat(userId: string, eventId: string): Promise<void> {
    const existing = await this.prisma.chat.findFirst({
      where: { eventId, kind: "table_group" },
    });
    const chat =
      existing ??
      (await this.prisma.chat.create({
        data: {
          kind: "table_group",
          eventId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }));
    const member = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: chat.id, userId } },
    });
    if (member) return;
    await this.prisma.chatMember.create({ data: { chatId: chat.id, userId } });
    const messageCount = await this.prisma.message.count({ where: { chatId: chat.id } });
    if (messageCount === 0) {
      await this.prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: userId,
          kind: "text",
          body: "Seat's booked — see you at the table.",
        },
      });
    }
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
      // The real-gateway path: with Razorpay the seat is confirmed here, not in
      // payBooking, so the confirmation mail has to hang off the webhook too.
      await this.ensureTableChat(payment.booking.userId, payment.booking.eventId);
      await this.bookingMail.sendConfirmation(payment.bookingId);
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
