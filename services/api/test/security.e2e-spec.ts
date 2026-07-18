import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * M7 security pass: authz on every route + IDOR. A user must never read or
 * mutate another user's resources, and role-gated routes reject non-privileged
 * callers. (Rate limiting is bypassed under NODE_ENV=test.)
 */
describe("security & authz (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const runId = String(Date.now()).slice(-8);
  const alice = { token: "", id: "" };
  const bob = { token: "", id: "" };
  let eventId = "";
  let aliceBookingId = "";

  async function login(handle: "a" | "b") {
    const phone = `+9178${runId}0${handle === "a" ? "1" : "2"}`;
    const res = await request(app.getHttpServer())
      .post("/v1/auth/otp/verify")
      .send({ phone, code: "000000" });
    return {
      token: res.body.access_token as string,
      id: JSON.parse(Buffer.from(res.body.access_token.split(".")[1], "base64").toString())
        .sub as string,
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });
    await app.init();
    prisma = app.get(PrismaService);

    Object.assign(alice, await login("a"));
    Object.assign(bob, await login("b"));

    const city = await prisma.city.findUniqueOrThrow({ where: { slug: "bangalore" } });
    const event = await prisma.event.create({
      data: {
        cityId: city.id,
        type: "chai",
        title: "Security test",
        slug: `security-test-${runId}`,
        description: "IDOR/authz test event.",
        startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        durationMin: 60,
        priceInr: 0,
        capacity: 6,
        budgetBand: "budget",
        status: "published",
      },
    });
    eventId = event.id;
    const booking = await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/bookings`)
      .set("Authorization", `Bearer ${alice.token}`);
    aliceBookingId = booking.body.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await app.close();
  });

  it("rejects unauthenticated access to protected routes", async () => {
    for (const path of ["/v1/me", "/v1/me/bookings", "/v1/chats", "/v1/me/connections"]) {
      await request(app.getHttpServer()).get(path).expect(401);
    }
  });

  it("rejects a tampered / garbage bearer token", async () => {
    await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", "Bearer not.a.real.jwt")
      .expect(401);
  });

  it("IDOR: bob cannot two-truths or cancel alice's booking", async () => {
    await request(app.getHttpServer())
      .post(`/v1/bookings/${aliceBookingId}/two-truths`)
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ truths: ["one thing here", "two thing here"], lie: "a lie goes here" })
      .expect(404); // not found for bob — never leaks existence
    await request(app.getHttpServer())
      .delete(`/v1/bookings/${aliceBookingId}`)
      .set("Authorization", `Bearer ${bob.token}`)
      .expect(404);

    // alice's booking is untouched
    const mine = await request(app.getHttpServer())
      .get("/v1/me/bookings")
      .set("Authorization", `Bearer ${alice.token}`)
      .expect(200);
    expect(mine.body.upcoming.some((b: { id: string }) => b.id === aliceBookingId)).toBe(true);
  });

  it("IDOR: bob cannot read a chat he's not a member of", async () => {
    const chat = await prisma.chat.create({
      data: { kind: "direct", members: { create: [{ userId: alice.id }] } },
    });
    await request(app.getHttpServer())
      .get(`/v1/chats/${chat.id}/messages`)
      .set("Authorization", `Bearer ${bob.token}`)
      .expect(404);
    await prisma.chatMember.deleteMany({ where: { chatId: chat.id } });
    await prisma.chat.delete({ where: { id: chat.id } });
  });

  it("role gate: a normal user cannot reach admin routes", async () => {
    const server = app.getHttpServer();
    const posts = [
      "/v1/admin/events",
      `/v1/admin/events/${eventId}/match`,
      "/v1/admin/decks/generate",
    ];
    for (const path of posts) {
      await request(server).post(path).set("Authorization", `Bearer ${alice.token}`).send({}).expect(403);
    }
    await request(server)
      .get("/v1/admin/decks/pending")
      .set("Authorization", `Bearer ${alice.token}`)
      .expect(403);
  });

  it("a refresh token cannot be used as an access token", async () => {
    const login = await request(app.getHttpServer())
      .post("/v1/auth/otp/verify")
      .send({ phone: `+9178${runId}09`, code: "000000" });
    await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", `Bearer ${login.body.refresh_token}`)
      .expect(401);
  });

  it("validation: malformed input is rejected at the boundary (Zod)", async () => {
    await request(app.getHttpServer())
      .post("/v1/auth/otp/request")
      .send({ phone: "not-a-phone" })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/ratings`)
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ overall: 99 })
      .expect(400);
  });
});
