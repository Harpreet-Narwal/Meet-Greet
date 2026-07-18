import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * THE M5 CRITICAL INVARIANT (CLAUDE.md, plan §6): a one-sided Spark is NEVER
 * visible to the recipient — in ANY payload, log, or UI state. Only a mutual
 * Spark (both open_to_dating, both sparked) surfaces and opens a chat.
 */
describe("spark privacy (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const runId = String(Date.now()).slice(-8);
  let eventId = "";
  // alice & bob both open_to_dating; carol friends_only
  const users: Record<string, { token: string; id: string }> = {};

  async function login(handle: string, intent: "open_to_dating" | "friends_only") {
    const phone = `+9174${runId}${handle === "alice" ? "01" : handle === "bob" ? "02" : "03"}`;
    const res = await request(app.getHttpServer())
      .post("/v1/auth/otp/verify")
      .send({ phone, code: "000000" });
    const token = res.body.access_token as string;
    const id = JSON.parse(Buffer.from(token.split(".")[1]!, "base64").toString()).sub as string;
    await prisma.user.update({
      where: { id },
      data: { firstName: handle, relationshipIntent: intent },
    });
    users[handle] = { token, id };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });
    await app.init();
    prisma = app.get(PrismaService);

    const city = await prisma.city.findUniqueOrThrow({ where: { slug: "bangalore" } });
    const event = await prisma.event.create({
      data: {
        cityId: city.id,
        type: "dinner",
        title: "Spark-privacy test",
        slug: `spark-test-${runId}`,
        description: "Testing the one-sided spark invisibility invariant.",
        startsAt: new Date(Date.now() - 3 * 3600 * 1000), // in the past (attended)
        durationMin: 120,
        priceInr: 0,
        capacity: 6,
        budgetBand: "moderate",
        status: "completed",
      },
    });
    eventId = event.id;
    const table = await prisma.eventTable.create({
      data: { eventId, tableNumber: 1, capacity: 6 },
    });

    await login("alice", "open_to_dating");
    await login("bob", "open_to_dating");
    await login("carol", "friends_only");

    // all three attended (checked in at the same table)
    for (const handle of ["alice", "bob", "carol"]) {
      await prisma.booking.create({
        data: {
          userId: users[handle]!.id,
          eventId,
          tableId: table.id,
          status: "checked_in",
          amountInr: 0,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.message.deleteMany({ where: { chat: { members: { some: { userId: { in: Object.values(users).map((u) => u.id) } } } } } });
    await prisma.chatMember.deleteMany({ where: { userId: { in: Object.values(users).map((u) => u.id) } } });
    await prisma.chat.deleteMany({ where: { eventId } });
    await prisma.connection.deleteMany({ where: { eventId } });
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.eventTable.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await app.close();
  });

  it("alice sparks bob one-sided → bob sees NOTHING of it, anywhere", async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${users.alice!.token}`)
      .send({ to_user: users.bob!.id, kind: "spark" })
      .expect(201);
    expect(res.body.status).toBe("pending");

    // 1. bob's connections list — empty of any incoming spark
    const bobConns = await request(app.getHttpServer())
      .get("/v1/me/connections")
      .set("Authorization", `Bearer ${users.bob!.token}`)
      .expect(200);
    expect(JSON.stringify(bobConns.body)).not.toContain(users.alice!.id);
    expect(bobConns.body).toEqual([]);

    // 2. bob's debrief for the event — alice must not appear as having sparked him
    const bobDebrief = await request(app.getHttpServer())
      .get(`/v1/events/${eventId}/debrief`)
      .set("Authorization", `Bearer ${users.bob!.token}`)
      .expect(200);
    const aliceRow = bobDebrief.body.tablemates.find(
      (t: { user_id: string }) => t.user_id === users.alice!.id,
    );
    // alice is a tablemate (bob can spark her back) but there's NO field telling
    // bob she sparked him — only bob's OWN i_sparked/i_connected flags exist.
    expect(aliceRow).toBeTruthy();
    expect(aliceRow.i_sparked).toBe(false);
    expect(aliceRow.i_connected).toBe(false);
    expect(Object.keys(aliceRow)).not.toContain("sparked_me");
    expect(Object.keys(aliceRow)).not.toContain("they_sparked");

    // 3. bob has no chats yet
    const bobChats = await request(app.getHttpServer())
      .get("/v1/chats")
      .set("Authorization", `Bearer ${users.bob!.token}`)
      .expect(200);
    expect(bobChats.body).toEqual([]);

    // 4. alice sees her OWN outgoing spark (that's fine — it's her action)
    const aliceConns = await request(app.getHttpServer())
      .get("/v1/me/connections")
      .set("Authorization", `Bearer ${users.alice!.token}`)
      .expect(200);
    expect(aliceConns.body).toHaveLength(1);
    expect(aliceConns.body[0].direction).toBe("outgoing");
    expect(aliceConns.body[0].status).toBe("pending");
  });

  it("bob sparks alice back → mutual, both see it, a direct chat opens", async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${users.bob!.token}`)
      .send({ to_user: users.alice!.id, kind: "spark" })
      .expect(201);
    expect(res.body.status).toBe("mutual");

    for (const who of ["alice", "bob"]) {
      const conns = await request(app.getHttpServer())
        .get("/v1/me/connections?status=mutual")
        .set("Authorization", `Bearer ${users[who]!.token}`)
        .expect(200);
      expect(conns.body.some((c: { status: string }) => c.status === "mutual")).toBe(true);
    }

    // a direct chat now exists for both
    const aliceChats = await request(app.getHttpServer())
      .get("/v1/chats")
      .set("Authorization", `Bearer ${users.alice!.token}`)
      .expect(200);
    expect(aliceChats.body.some((c: { is_spark: boolean }) => c.is_spark)).toBe(true);
  });

  it("carol (friends_only) cannot send a Spark", async () => {
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${users.carol!.token}`)
      .send({ to_user: users.alice!.id, kind: "spark" })
      .expect(400);
  });

  it("a spark toward carol (friends_only) can never become mutual", async () => {
    // alice sparks carol; carol is friends_only → even if carol 'sparked' back
    // (she can't), it stays invisible and non-mutual.
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${users.alice!.token}`)
      .send({ to_user: users.carol!.id, kind: "spark" })
      .expect(201);
    const carolConns = await request(app.getHttpServer())
      .get("/v1/me/connections")
      .set("Authorization", `Bearer ${users.carol!.token}`)
      .expect(200);
    expect(JSON.stringify(carolConns.body)).not.toContain(users.alice!.id);
  });

  it("Connect (friends) is mutual-gated too and opens a chat when reciprocated", async () => {
    // carol connects alice; alice connects carol → mutual friend chat
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${users.carol!.token}`)
      .send({ to_user: users.alice!.id, kind: "connect" })
      .expect(201);
    const back = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${users.alice!.token}`)
      .send({ to_user: users.carol!.id, kind: "connect" })
      .expect(201);
    expect(back.body.status).toBe("mutual");
  });
});
