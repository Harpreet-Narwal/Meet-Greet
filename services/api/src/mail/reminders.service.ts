import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "./mail.service";

/** How long before an event the reminder goes out. */
const LEAD_HOURS = 2;
/**
 * Only look this far back. Without a floor, an api that was down for a day
 * would wake up and mail everyone about dinners that already happened.
 */
const LOOKBACK_HOURS = 6;

const IST = "Asia/Kolkata";

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Mail everyone holding a confirmed seat at a table starting in the next
   * ~2 hours. Idempotent via `bookings.reminder_sent_at`, so re-running the job
   * — or running two workers — never double-sends.
   */
  async sendDueReminders(now = new Date()): Promise<number> {
    const until = new Date(now.getTime() + LEAD_HOURS * 3600_000);
    const floor = new Date(now.getTime() - LOOKBACK_HOURS * 3600_000);

    const due = await this.prisma.booking.findMany({
      where: {
        status: { in: ["confirmed", "checked_in"] },
        reminderSentAt: null,
        event: {
          startsAt: { lte: until, gte: floor },
          status: { notIn: ["cancelled", "draft"] },
        },
      },
      include: { event: { include: { venue: true } }, user: true },
    });

    let sent = 0;
    for (const booking of due) {
      // No email on file — mark it handled anyway so this booking does not get
      // re-examined on every tick for the rest of the evening.
      if (!booking.user.email) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSentAt: new Date() },
        });
        continue;
      }

      const when = new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: IST,
      }).format(booking.event.startsAt);

      // The venue is only in the payload once the T-24h reveal has run — never
      // leak it early here.
      const revealed = ["revealed", "live", "completed"].includes(booking.event.status);
      const where =
        revealed && booking.event.venue
          ? `${booking.event.venue.name}\n${booking.event.venue.address}, ${booking.event.venue.neighborhood}`
          : (booking.event.neighborhoodTeaser ?? "Check the app for the address.");

      const ok = await this.mail.send({
        to: booking.user.email,
        subject: `Tonight at ${when.split(" at ").pop()} — ${booking.event.title}`,
        text: [
          `${booking.user.firstName ?? "Hi"},`,
          "",
          `Your table is in about ${LEAD_HOURS} hours.`,
          "",
          booking.event.title,
          when + " IST",
          "",
          where,
          "",
          "Running late or can't make it? Open the app and let your table know —",
          "five people are counting on the sixth chair being filled.",
          "",
          "See you there.",
          "Mulaqat",
        ].join("\n"),
      });

      // Mark sent either way. A transient SMTP failure is logged by MailService;
      // retrying on the next tick would risk a burst of duplicates to everyone
      // whose mail actually did go out.
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      });
      if (ok) sent += 1;
    }

    if (sent > 0) this.logger.log(`sent ${sent} table reminder(s)`);
    return sent;
  }
}
