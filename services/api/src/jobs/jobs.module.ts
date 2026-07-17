import { Injectable, Logger, Module, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker } from "bullmq";

import { BookingsModule } from "../bookings/bookings.module";
import { BookingsService } from "../bookings/bookings.service";
import { env } from "../config/env";

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

  constructor(private readonly bookings: BookingsService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (env.NODE_ENV === "test") return;
    const connection = { url: env.REDIS_URL };
    this.queue = new Queue(QUEUE, { connection });
    await this.queue.upsertJobScheduler("booking-expiry", { every: 60_000 });
    this.worker = new Worker(
      QUEUE,
      async (job) => {
        if (job.name === "booking-expiry") await this.bookings.expireStalePending();
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
  imports: [BookingsModule],
  providers: [JobsService],
})
export class JobsModule {}
