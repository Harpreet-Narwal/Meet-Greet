import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rate the night (private; feeds matching quality later). One per booking. */
  async rate(
    userId: string,
    eventId: string,
    dto: { overall: number; host_rating?: number; venue_rating?: number; feedback?: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (!booking) throw new NotFoundException("no booking to rate");
    if (booking.status !== "checked_in" && booking.status !== "no_show") {
      throw new BadRequestException("you can rate a night you attended");
    }
    if (dto.overall < 1 || dto.overall > 5) throw new BadRequestException("overall is 1-5");

    await this.prisma.eventRating.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        overall: dto.overall,
        hostRating: dto.host_rating,
        venueRating: dto.venue_rating,
        feedback: dto.feedback,
      },
      update: {
        overall: dto.overall,
        hostRating: dto.host_rating,
        venueRating: dto.venue_rating,
        feedback: dto.feedback,
      },
    });
    return { rated: true };
  }

  /** Post-event debrief data: your tablemates you can Connect/Spark with. */
  async debrief(userId: string, eventId: string) {
    const myBooking = await this.prisma.booking.findUnique({
      where: { userId_eventId: { userId, eventId } },
      include: { event: true },
    });
    if (!myBooking) throw new NotFoundException("you weren't at this event");

    const tablemates = myBooking.tableId
      ? await this.prisma.booking.findMany({
          where: {
            tableId: myBooking.tableId,
            userId: { not: userId },
            status: { in: ["checked_in", "no_show"] },
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                photoUrl: true,
                personalityProfile: { select: { archetype: true, archetypeEmoji: true } },
              },
            },
          },
        })
      : [];

    // my own already-sent intents (so the UI shows what I've done — never theirs)
    const mine = await this.prisma.connection.findMany({
      where: { eventId, fromUserId: userId },
      select: { toUserId: true, kind: true },
    });
    const sent = new Set(mine.map((m) => `${m.toUserId}:${m.kind}`));

    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      event_id: eventId,
      already_rated: Boolean(
        await this.prisma.eventRating.findUnique({ where: { bookingId: myBooking.id } }),
      ),
      i_am_open_to_dating: me?.relationshipIntent === "open_to_dating",
      tablemates: tablemates.map((t) => ({
        user_id: t.user.id,
        first_name: t.user.firstName,
        photo_url: t.user.photoUrl,
        archetype: t.user.personalityProfile?.archetype ?? null,
        archetype_emoji: t.user.personalityProfile?.archetypeEmoji ?? null,
        i_connected: sent.has(`${t.user.id}:connect`),
        i_sparked: sent.has(`${t.user.id}:spark`),
      })),
    };
  }
}
