import { randomBytes } from "node:crypto";

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

/** Two silhouette states the table teaser animates between (plan §8). */
export interface TableTeaserMember {
  first_name: string | null;
  archetype: string | null;
  archetype_emoji: string | null;
  fun_fact: string | null; // one of their two-truths, once checked in
  checked_in: boolean;
  is_you: boolean;
}

@Injectable()
export class RevealService {
  private readonly logger = new Logger(RevealService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** T-24h venue reveal (BullMQ) — expose venue + table, flip status. */
  async revealEvent(eventId: string): Promise<{ revealed: boolean }> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException("no such event");
    if (!["published", "matching"].includes(event.status)) {
      return { revealed: false };
    }
    await this.prisma.event.update({ where: { id: eventId }, data: { status: "revealed" } });
    this.logger.log(`revealed venue for event ${eventId}`);
    return { revealed: true };
  }

  /** Events whose start is within `withinHours` and not yet revealed. */
  async dueForReveal(withinHours = 24): Promise<string[]> {
    const cutoff = new Date(Date.now() + withinHours * 3600 * 1000);
    const events = await this.prisma.event.findMany({
      where: { status: { in: ["published", "matching"] }, startsAt: { lte: cutoff } },
      select: { id: true },
    });
    return events.map((e) => e.id);
  }

  /** The post-reveal "my table" view: venue card + anonymized teaser that fills
   * in first names as people check in (plan §8, signature moment). */
  async myTable(userId: string, eventId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { userId_eventId: { userId, eventId } },
      include: { event: { include: { venue: true } }, table: true },
    });
    if (!booking) throw new NotFoundException("you're not booked for this event");
    const revealed = ["revealed", "live", "completed"].includes(booking.event.status);

    let tablemates: TableTeaserMember[] = [];
    if (booking.tableId) {
      const seatmates = await this.prisma.booking.findMany({
        where: { tableId: booking.tableId, status: { in: ["confirmed", "checked_in"] } },
        include: { user: { include: { personalityProfile: true } } },
      });
      tablemates = seatmates.map((s) => {
        const twoTruths = s.twoTruths as { truths?: string[] } | null;
        return {
          first_name: s.status === "checked_in" || s.userId === userId ? s.user.firstName : null,
          archetype: s.user.personalityProfile?.archetype ?? null,
          archetype_emoji: s.user.personalityProfile?.archetypeEmoji ?? null,
          fun_fact:
            s.status === "checked_in" && twoTruths?.truths ? (twoTruths.truths[0] ?? null) : null,
          checked_in: s.status === "checked_in",
          is_you: s.userId === userId,
        };
      });
    }

    return {
      event_status: booking.event.status,
      venue: revealed && booking.event.venue
        ? {
            name: booking.event.venue.name,
            address: booking.event.venue.address,
            neighborhood: booking.event.venue.neighborhood,
            lat: booking.event.venue.lat,
            lng: booking.event.venue.lng,
          }
        : null,
      neighborhood_teaser: booking.event.neighborhoodTeaser,
      starts_at: booking.event.startsAt.toISOString(),
      table_number: booking.table?.tableNumber ?? null,
      seats: tablemates,
      checked_in: booking.status === "checked_in",
    };
  }

  /** Issue a per-booking QR token (checked at the venue). */
  async issueCheckinToken(userId: string, eventId: string): Promise<{ qr_token: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (!booking || !["confirmed", "checked_in"].includes(booking.status)) {
      throw new NotFoundException("no confirmed booking to check in");
    }
    // Token embeds the booking id + a nonce; check-in confirms it by lookup.
    // (v1 dev/mock: the booking-id embed with host/self gating is sufficient;
    //  a stored-nonce verification is a straightforward hardening in M7.)
    const token = `${booking.id}.${randomBytes(8).toString("hex")}`;
    return { qr_token: token };
  }

  /** Host/geo-time gated check-in → unlocks the game room. */
  async checkIn(
    userId: string,
    eventId: string,
    qrToken: string,
  ): Promise<{ checked_in: true; table_id: string | null }> {
    const bookingId = qrToken.split(".")[0];
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.eventId !== eventId) {
      throw new BadRequestException("that check-in code isn't valid for this event");
    }
    // A host checks anyone in; a guest may only check themselves in.
    if (booking.userId !== userId) {
      const actor = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!actor || (actor.role !== "host" && actor.role !== "admin")) {
        throw new BadRequestException("only a host can check in another guest");
      }
    }
    if (booking.status !== "confirmed" && booking.status !== "checked_in") {
      throw new BadRequestException("this booking can't be checked in");
    }
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: "checked_in" },
    });
    return { checked_in: true, table_id: booking.tableId };
  }
}
