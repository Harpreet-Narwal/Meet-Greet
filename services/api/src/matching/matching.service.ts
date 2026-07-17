import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Booking, PersonalityProfile, User } from "@prisma/client";

import { AiClient, type MatchAttendee } from "../ai/ai.client";
import { env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

type AttendeeRow = Booking & { user: User & { personalityProfile: PersonalityProfile | null } };

function ageFrom(dob: Date | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiClient,
  ) {}

  private toAttendee(row: AttendeeRow): MatchAttendee {
    const p = row.user.personalityProfile;
    return {
      user_id: row.userId,
      energy: p?.traitEnergy ?? 0,
      depth: p?.traitDepth ?? 0,
      novelty: p?.traitNovelty ?? 0,
      structure: p?.traitStructure ?? 0,
      humor_styles: p?.humorStyles ?? [],
      interests: row.user.interests,
      languages: row.user.languages,
      age: ageFrom(row.user.dob),
      gender: row.user.gender,
      dietary: row.user.dietary,
      intent: row.user.relationshipIntent,
    };
  }

  /** Run matching for an event: gather confirmed attendees → ai /match/compose
   * → persist a match_run + assignments, seat bookings at their tables. */
  async runForEvent(eventId: string, createdBy: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { tables: { orderBy: { tableNumber: "asc" } } },
    });
    if (!event) throw new NotFoundException("no such event");

    const bookings = await this.prisma.booking.findMany({
      where: { eventId, status: { in: ["confirmed", "checked_in"] } },
      include: { user: { include: { personalityProfile: true } } },
    });
    if (bookings.length < 5) {
      throw new BadRequestException("need at least 5 confirmed guests to compose tables");
    }

    // blocked pairs = mutual blocks among these attendees
    const userIds = bookings.map((b) => b.userId);
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: { in: userIds }, blockedId: { in: userIds } },
    });
    const blockedPairs = blocks.map(
      (b) => [b.blockerId, b.blockedId] as [string, string],
    );

    const response = await this.ai.composeTables({
      event_id: eventId,
      attendees: bookings.map((b) => this.toAttendee(b)),
      params: {
        table_size: 6,
        women_only: event.womenOnly,
        seed: env.NODE_ENV === "test" ? 42 : Date.now() % 100000,
      },
      blocked_pairs: blockedPairs,
    });

    // Ensure enough event_tables exist for the composed tables
    const needed = response.tables.length;
    for (let n = event.tables.length; n < needed; n++) {
      await this.prisma.eventTable.create({
        data: { eventId, tableNumber: n + 1, capacity: 6 },
      });
    }
    const eventTables = await this.prisma.eventTable.findMany({
      where: { eventId },
      orderBy: { tableNumber: "asc" },
    });

    const matchRun = await this.prisma.$transaction(async (tx) => {
      const run = await tx.matchRun.create({
        data: {
          eventId,
          algoVersion: response.algo_version,
          params: { women_only: event.womenOnly },
          status: "completed",
          scoreSummary: response.score_summary as object,
          createdBy,
        },
      });
      for (const [index, table] of response.tables.entries()) {
        const eventTable = eventTables[index];
        if (!eventTable) continue;
        for (const userId of table.user_ids) {
          await tx.matchAssignment.create({
            data: {
              matchRunId: run.id,
              tableId: eventTable.id,
              userId,
              tableScore: table.score,
              explain: table.explain as object,
            },
          });
          await tx.booking.updateMany({
            where: { eventId, userId },
            data: { tableId: eventTable.id },
          });
        }
      }
      await tx.event.update({ where: { id: eventId }, data: { status: "matching" } });
      return run;
    });

    this.logger.log(
      `matched event ${eventId}: ${response.tables.length} tables, ` +
        `mean score ${String(response.score_summary.mean_table_score)}`,
    );
    return { match_run_id: matchRun.id, ...response };
  }

  /** Admin explain view: tables with assignments + explain payloads. */
  async explain(eventId: string) {
    const run = await this.prisma.matchRun.findFirst({
      where: { eventId, status: "completed" },
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          include: { user: { select: { firstName: true, id: true } }, table: true },
        },
      },
    });
    if (!run) throw new NotFoundException("no completed match run for this event");
    const byTable = new Map<number, { first_name: string | null; user_id: string }[]>();
    const explainByTable = new Map<number, unknown>();
    for (const a of run.assignments) {
      const list = byTable.get(a.table.tableNumber) ?? [];
      list.push({ first_name: a.user.firstName, user_id: a.user.id });
      byTable.set(a.table.tableNumber, list);
      explainByTable.set(a.table.tableNumber, a.explain);
    }
    return {
      match_run_id: run.id,
      algo_version: run.algoVersion,
      score_summary: run.scoreSummary,
      tables: [...byTable.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([tableNumber, members]) => ({
          table_number: tableNumber,
          members,
          explain: explainByTable.get(tableNumber),
        })),
    };
  }
}
