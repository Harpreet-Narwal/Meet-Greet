import { Injectable, Logger, Module, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker } from "bullmq";

import { BookingsModule } from "../bookings/bookings.module";
import { BookingsService } from "../bookings/bookings.service";
import { ChatModule } from "../chat/chat.module";
import { ChatService } from "../chat/chat.service";
import { env } from "../config/env";
import { MatchingModule } from "../matching/matching.module";
import { MatchingService } from "../matching/matching.service";
import { RevealService } from "../matching/reveal.service";
import { PrismaService } from "../prisma/prisma.service";

const QUEUE = "housekeeping";

/**
 * BullMQ scheduled jobs (plan §6). M2 ships booking-expiry; venue-reveal,
 * match-trigger, reminders, chat-expiry and rating-nudge land with their
 * milestones. Workers don't start under test.
 */
@Injectable()
export class JobsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly bookings: BookingsService,
    private readonly reveal: RevealService,
    private readonly matching: MatchingService,
    private readonly chat: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (env.NODE_ENV === "test") return;
    const connection = { url: env.REDIS_URL };
    this.queue = new Queue(QUEUE, { connection });
    await this.queue.upsertJobScheduler("booking-expiry", { every: 60_000 });
    // venue-reveal (T-24h) + match-trigger (T-36h): check every 5 min
    await this.queue.upsertJobScheduler("venue-reveal", { every: 300_000 });
    // rating-nudge (T+2h): opens the 7-day table group chat; chat-expiry: daily
    await this.queue.upsertJobScheduler("rating-nudge", { every: 600_000 });
    await this.queue.upsertJobScheduler("chat-expiry", { every: 24 * 3600_000 });
    this.worker = new Worker(
      QUEUE,
      async (job) => {
        if (job.name === "booking-expiry") {
          await this.bookings.expireStalePending();
        } else if (job.name === "venue-reveal") {
          // T-36h: auto-run matching if an admin hasn't; T-24h: reveal.
          for (const eventId of await this.reveal.dueForReveal(36)) {
            await this.matching.runForEvent(eventId, "system").catch((error) => {
              this.logger.warn(`auto-match skipped for ${eventId}: ${String(error)}`);
            });
          }
          for (const eventId of await this.reveal.dueForReveal(24)) {
            await this.reveal.revealEvent(eventId);
          }
        } else if (job.name === "rating-nudge") {
          // T+2h: open the table group chat for events that just finished
          const since = new Date(Date.now() - 6 * 3600_000);
          const done = await this.prisma.event.findMany({
            where: { startsAt: { lt: new Date(), gte: since } },
            include: { tables: { select: { id: true } } },
          });
          for (const event of done) {
            for (const table of event.tables) {
              await this.chat.ensureTableGroupChat(event.id, table.id);
            }
          }
        } else if (job.name === "chat-expiry") {
          await this.chat.expireGroupChats();
        }
      },
      { connection },
    );
    this.worker.on("failed", (job, error) => {
      this.logger.error(`job ${job?.name} failed: ${error.message}`);
    });
    this.logger.log("housekeeping worker up (booking-expiry every 60s)");
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({
  imports: [BookingsModule, MatchingModule, ChatModule],
  providers: [JobsService],
})
export class JobsModule {}
