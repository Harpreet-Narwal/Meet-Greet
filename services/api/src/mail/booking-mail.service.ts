import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "./mail.service";

const IST = "Asia/Kolkata";

/**
 * The "your seat is confirmed" mail.
 *
 * Kept separate from MailService, which is transport only, and from
 * RemindersService, which owns the T-2h nudge — this one is triggered by a state
 * change (booking → confirmed) rather than by a scheduler.
 *
 * Nothing here is allowed to throw. It is called immediately after money has
 * been taken and the seat committed; a dead SMTP host must never turn a
 * successful payment into a failed request.
 */
@Injectable()
export class BookingMailService {
  private readonly logger = new Logger(BookingMailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async sendConfirmation(bookingId: string): Promise<void> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { event: { include: { venue: true } }, user: true },
      });
      if (!booking?.user.email) return;

      const when = new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: IST,
      }).format(booking.event.startsAt);

      // Same rule as the reminder: the venue is only in the payload once the
      // T-24h reveal has run. A confirmation mail must not leak it early.
      const revealed = ["revealed", "live", "completed"].includes(booking.event.status);
      const where =
        revealed && booking.event.venue
          ? `${booking.event.venue.name}\n${booking.event.venue.address}, ${booking.event.venue.neighborhood}`
          : `${booking.event.neighborhoodTeaser ?? "Somewhere good"}\nExact address lands 24 hours before.`;

      await this.mail.send({
        to: booking.user.email,
        subject: `You're in — ${booking.event.title}`,
        text: [
          `${booking.user.firstName ?? "Hi"},`,
          "",
          "Your seat is confirmed. Five other people are about to become",
          "the reason you leave the house.",
          "",
          booking.event.title,
          `${when} IST`,
          "",
          where,
          "",
          booking.amountInr > 0
            ? `Paid: ₹${booking.amountInr} (the booking fee — food and drinks are settled at the table)`
            : "Free table — just turn up.",
          "",
          "Your table's group chat is open in the app, so you can sort out",
          "who's bringing what before anyone sits down.",
          "",
          "Plans change — cancel more than 48 hours ahead and the full amount",
          "comes back as credit.",
          "",
          "See you there.",
          "Mulaqat",
        ].join("\n"),
      });
    } catch (error) {
      // Swallow deliberately — see the class comment.
      this.logger.error(`confirmation mail for booking ${bookingId} failed: ${String(error)}`);
    }
  }
}
