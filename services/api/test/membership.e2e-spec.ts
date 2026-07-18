import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * M6 acceptance (plan §11): Plus gates enforced SERVER-SIDE. Free members get
 * a fixed number of connects per event; Plus removes the cap. Sparks are never
 * capped (dating is not paywalled), and "who sparked you" only ever shows
 * MUTUAL sparks — the one-sided-Spark invariant holds even for Plus.
 */
describe("membership & Plus gating (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const runId = String(Date.now()).slice(-8);
  let eventId = "";
  let tableId = "";
  const guests: { token: string; id: string }[] = [];

  async function makeGuest(i: number, intent: "open_to_dating" | "friends_only") {
    const phone = `+9175${runId}${String(i).padStart(2, "0")}`;
    const res = await request(app.getHttpServer())
      .post("/v1/auth/otp/verify")
      .send({ phone, code: "000000" });
    const token = res.body.access_token as string;
    const id = JSON.parse(Buffer.from(token.split(".")[1]!, "base64").toString()).sub as string;
    await prisma.user.update({
      where: { id },
      data: { firstName: `Guest${i}`, relationshipIntent: intent },
    });
    await prisma.booking.create({
      data: { userId: id, eventId, tableId, status: "checked_in", amountInr: 0 },
    });
    return { token, id };
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
        title: "Membership test",
        slug: `membership-test-${runId}`,
        description: "Plus gating test event.",
        startsAt: new Date(Date.now() - 3 * 3600 * 1000),
        durationMin: 120,
        priceInr: 0,
        capacity: 8,
        budgetBand: "moderate",
        status: "completed",
      },
    });
    eventId = event.id;
    const table = await prisma.eventTable.create({ data: { eventId, tableNumber: 1, capacity: 8 } });
    tableId = table.id;
    // 0 = the actor; 1..5 = tablemates to connect with
    for (let i = 0; i < 6; i++) guests.push(await makeGuest(i, "open_to_dating"));
  });

  afterAll(async () => {
    const ids = guests.map((g) => g.id);
    await prisma.subscription.deleteMany({ where: { userId: { in: ids } } });
    await prisma.connection.deleteMany({ where: { eventId } });
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.eventTable.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await app.close();
  });

  it("free member is capped at 3 connects per event; the 4th is blocked server-side", async () => {
    const actor = guests[0]!;
    for (let i = 1; i <= 3; i++) {
      await request(app.getHttpServer())
        .post(`/v1/events/${eventId}/connections`)
        .set("Authorization", `Bearer ${actor.token}`)
        .send({ to_user: guests[i]!.id, kind: "connect" })
        .expect(201);
    }
    // 4th connect → 403 (Plus required)
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${actor.token}`)
      .send({ to_user: guests[4]!.id, kind: "connect" })
      .expect(403);
  });

  it("Sparks are never capped by the free tier", async () => {
    const actor = guests[0]!;
    // actor already used 3 connects; a spark still goes through
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${actor.token}`)
      .send({ to_user: guests[5]!.id, kind: "spark" })
      .expect(201);
  });

  it("upgrading to Plus removes the connects cap", async () => {
    const actor = guests[0]!;
    const before = await request(app.getHttpServer())
      .get("/v1/me/membership")
      .set("Authorization", `Bearer ${actor.token}`)
      .expect(200);
    expect(before.body.tier).toBe("free");
    expect(before.body.benefits.unlimited_connects).toBe(false);

    await request(app.getHttpServer())
      .post("/v1/me/membership/subscribe")
      .set("Authorization", `Bearer ${actor.token}`)
      .send({ tier: "plus" })
      .expect(201);

    // now the previously-blocked 4th connect succeeds
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${actor.token}`)
      .send({ to_user: guests[4]!.id, kind: "connect" })
      .expect(201);
  });

  it("'who sparked me' is Plus-only and shows MUTUAL sparks only (invariant holds)", async () => {
    const actor = guests[0]!; // now Plus
    const target = guests[5]!; // actor sparked them earlier (one-sided so far)

    // one-sided: actor sparked target, target hasn't sparked back → NOT shown
    const oneSided = await request(app.getHttpServer())
      .get("/v1/me/membership/who-sparked-me")
      .set("Authorization", `Bearer ${actor.token}`)
      .expect(200);
    expect(JSON.stringify(oneSided.body)).not.toContain(target.id);

    // free member can't access it at all
    await request(app.getHttpServer())
      .get("/v1/me/membership/who-sparked-me")
      .set("Authorization", `Bearer ${guests[1]!.token}`)
      .expect(403);

    // make it mutual → now it appears (safe: both sparked)
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/connections`)
      .set("Authorization", `Bearer ${target.token}`)
      .send({ to_user: actor.id, kind: "spark" })
      .expect(201);
    const mutual = await request(app.getHttpServer())
      .get("/v1/me/membership/who-sparked-me")
      .set("Authorization", `Bearer ${actor.token}`)
      .expect(200);
    expect(mutual.body.sparked_by.some((s: { id: string }) => s.id === target.id)).toBe(true);
  });
});
