import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { RevealService } from "../src/matching/reveal.service";

/**
 * M3 acceptance (plan §11): a seeded event of ~30 confirmed guests →
 * valid tables with explanations; reveal + QR check-in end to end.
 * Uses the REAL ai service (AI_URL) so the matching engine runs for real.
 */
describe("matching, reveal & check-in (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reveal: RevealService;
  let adminToken = "";
  let eventId = "";
  const runId = String(Date.now()).slice(-9);
  const guestTokens: { userId: string; token: string }[] = [];

  beforeAll(async () => {
    // point the api at the real ai service for /match/compose
    process.env.AI_URL = process.env.AI_URL_OVERRIDE ?? "http://localhost:8000";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });
    await app.init();
    prisma = app.get(PrismaService);
    reveal = app.get(RevealService);

    const city = await prisma.city.findUniqueOrThrow({ where: { slug: "bangalore" } });
    const starts = new Date(Date.now() + 40 * 3600 * 1000); // 40h out
    const event = await prisma.event.create({
      data: {
        cityId: city.id,
        venueId: (await prisma.venue.findFirst({ where: { cityId: city.id } }))?.id,
        type: "dinner",
        title: "Matching-test dinner",
        slug: `match-test-${runId}`,
        description: "A seeded 30-guest dinner for the matching acceptance test.",
        startsAt: starts,
        durationMin: 150,
        priceInr: 0, // free → bookings auto-confirm without payment
        capacity: 36,
        budgetBand: "moderate",
        neighborhoodTeaser: "A matching-test neighbourhood",
        status: "published",
      },
    });
    eventId = event.id;

    // admin login
    const admin = await request(app.getHttpServer())
      .post("/v1/auth/otp/verify")
      .send({ phone: "+911000000001", code: "000000" });
    adminToken = admin.body.access_token;

    // 30 guests: create users with personality profiles, book them (free → confirmed)
    const languages = ["English", "Hindi"];
    for (let i = 0; i < 30; i++) {
      // +91 + 10 national digits, unique per guest (E.164)
      const phone = `+917${runId.slice(-7)}${String(i).padStart(2, "0")}`;
      const login = await request(app.getHttpServer())
        .post("/v1/auth/otp/verify")
        .send({ phone, code: "000000" });
      const token = login.body.access_token;
      const userId = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString(),
      ).sub as string;
      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: `Guest${i}`,
          gender: i % 2 === 0 ? "woman" : "man",
          dob: new Date(Date.UTC(1994 + (i % 6), 3, 1)),
          languages,
          interests: ["Food & cooking", "Films & series", i % 2 ? "Books" : "Travel"],
        },
      });
      await prisma.personalityProfile.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          quizVersion: "v1",
          traitEnergy: (i % 5) / 4 - 0.5,
          traitDepth: (i % 3) / 2 - 0.5,
          traitNovelty: (i % 4) / 3 - 0.5,
          traitStructure: 0,
          humorStyles: [i % 2 ? "dry" : "goofy"],
          archetype: "Curious Wanderer",
          archetypeEmoji: "🧭",
          completedAt: new Date(),
        },
      });
      await request(app.getHttpServer())
        .post(`/v1/events/${eventId}/bookings`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201);
      guestTokens.push({ userId, token });
    }
  }, 60_000);

  afterAll(async () => {
    await prisma.matchAssignment.deleteMany({ where: { matchRun: { eventId } } });
    await prisma.matchRun.deleteMany({ where: { eventId } });
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.eventTable.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await app.close();
  });

  it("composes 5+ valid tables with chemistry explanations", async () => {
    const response = await request(app.getHttpServer())
      .post(`/v1/admin/events/${eventId}/match`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(201);

    expect(response.body.tables.length).toBeGreaterThanOrEqual(5);
    expect(response.body.score_summary.hard_constraint_violations).toBe(0);
    for (const table of response.body.tables) {
      expect(table.user_ids.length).toBeGreaterThanOrEqual(5);
      expect(table.user_ids.length).toBeLessThanOrEqual(6);
      expect(table.explain).toHaveProperty("components");
      expect(table.explain).toHaveProperty("top_shared_interests");
    }
    // every guest seated exactly once
    const seated = response.body.tables.flatMap((t: { user_ids: string[] }) => t.user_ids);
    expect(new Set(seated).size).toBe(30);
  });

  it("admin explain view lists tables with members and breakdown", async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/admin/events/${eventId}/match/explain`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.tables[0].members[0]).toHaveProperty("first_name");
    expect(response.body.tables[0]).toHaveProperty("explain");
  });

  it("before reveal, my-table hides the venue", async () => {
    const guest = guestTokens[0]!;
    const response = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/my-table`)
      .set("Authorization", `Bearer ${guest.token}`)
      .expect(200);
    expect(response.body.venue).toBeNull();
    expect(response.body.table_number).toBeGreaterThanOrEqual(1);
    expect(response.body.seats.length).toBeGreaterThanOrEqual(5);
    // tablemates are anonymized (no first names) until they check in
    const others = response.body.seats.filter((s: { is_you: boolean }) => !s.is_you);
    expect(others.every((s: { first_name: string | null }) => s.first_name === null)).toBe(true);
  });

  it("reveal (time-travel hook) flips status and exposes the venue", async () => {
    // time-travel: the T-24h job calls revealEvent; invoke it directly
    const result = await reveal.revealEvent(eventId);
    expect(result.revealed).toBe(true);

    const guest = guestTokens[0]!;
    const response = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/my-table`)
      .set("Authorization", `Bearer ${guest.token}`)
      .expect(200);
    expect(response.body.event_status).toBe("revealed");
    expect(response.body.venue).not.toBeNull();
    expect(response.body.venue.name).toBeTruthy();
  });

  it("QR check-in unlocks the seat and fills in the teaser", async () => {
    const guest = guestTokens[0]!;
    const tokenRes = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/checkin-token`)
      .set("Authorization", `Bearer ${guest.token}`)
      .expect(200);
    const qr = tokenRes.body.qr_token;

    const checkin = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/checkin`)
      .set("Authorization", `Bearer ${guest.token}`)
      .send({ qr_token: qr })
      .expect(201);
    expect(checkin.body.checked_in).toBe(true);

    // now this guest's own name shows on their table view
    const table = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/my-table`)
      .set("Authorization", `Bearer ${guest.token}`)
      .expect(200);
    const me = table.body.seats.find((s: { is_you: boolean }) => s.is_you);
    expect(me.checked_in).toBe(true);
  });

  it("a guest cannot check in another guest", async () => {
    const g0 = guestTokens[0]!;
    const g1 = guestTokens[1]!;
    const tokenRes = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/checkin-token`)
      .set("Authorization", `Bearer ${g1.token}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/checkin`)
      .set("Authorization", `Bearer ${g0.token}`)
      .send({ qr_token: tokenRes.body.qr_token })
      .expect(400);
  });
});
