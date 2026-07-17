import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { BookingsService } from "../src/bookings/bookings.service";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * The M2 critical invariant (plan §11): concurrent bookings can never
 * oversell a table. Capacity is a hard wall enforced by SELECT … FOR UPDATE.
 */
describe("booking oversell race (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bookings: BookingsService;
  let eventId = "";
  const CAPACITY = 6;
  const CONTENDERS = 10;
  const tokens: string[] = [];
  const runId = String(Date.now());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });
    await app.init();
    prisma = app.get(PrismaService);
    bookings = app.get(BookingsService);

    const city = await prisma.city.findUniqueOrThrow({ where: { slug: "bangalore" } });
    const starts = new Date(Date.now() + 5 * 24 * 3600 * 1000); // 5 days out (>48h)
    const event = await prisma.event.create({
      data: {
        cityId: city.id,
        type: "dinner",
        title: "Race-test table",
        slug: `race-test-${runId}`,
        description: "Capacity war-game table for the oversell invariant.",
        startsAt: starts,
        durationMin: 120,
        priceInr: 399,
        capacity: CAPACITY,
        budgetBand: "moderate",
        status: "published",
      },
    });
    eventId = event.id;

    for (let i = 0; i < CONTENDERS; i++) {
      const response = await request(app.getHttpServer())
        .post("/v1/auth/otp/verify")
        .send({ phone: `+9177${runId.slice(-6)}${String(i).padStart(2, "0")}`, code: "000000" })
        .expect(200);
      tokens.push(response.body.access_token);
    }
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { booking: { eventId } } });
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await app.close();
  });

  it("books 10 people into 6 seats concurrently — exactly 6 confirmed, 4 waitlisted, zero oversell", async () => {
    const responses = await Promise.all(
      tokens.map((token) =>
        request(app.getHttpServer())
          .post(`/v1/events/${eventId}/bookings`)
          .set("Authorization", `Bearer ${token}`),
      ),
    );

    const statuses = responses.map((response) => {
      expect(response.status).toBe(201);
      return response.body.status as string;
    });
    expect(statuses.filter((status) => status === "confirmed")).toHaveLength(CAPACITY);
    expect(statuses.filter((status) => status === "waitlisted")).toHaveLength(
      CONTENDERS - CAPACITY,
    );

    const confirmedInDb = await prisma.booking.count({
      where: { eventId, status: { in: ["pending_payment", "confirmed", "checked_in"] } },
    });
    expect(confirmedInDb).toBe(CAPACITY); // the wall held
  });

  it("cancellation frees the seat and promotes the oldest waitlisted booking", async () => {
    const confirmed = await prisma.booking.findFirst({
      where: { eventId, status: "confirmed" },
      orderBy: { createdAt: "asc" },
    });
    const oldestWaitlisted = await prisma.booking.findFirst({
      where: { eventId, status: "waitlisted" },
      orderBy: { createdAt: "asc" },
    });
    expect(confirmed && oldestWaitlisted).toBeTruthy();

    const ownerToken = tokens[0]; // find the owner's token by matching userId
    const owner = await prisma.user.findUniqueOrThrow({ where: { id: confirmed!.userId } });
    const ownerIndex = Number(owner.phone.slice(-2));
    const response = await request(app.getHttpServer())
      .delete(`/v1/bookings/${confirmed!.id}`)
      .set("Authorization", `Bearer ${tokens[ownerIndex] ?? ownerToken}`)
      .expect(200);
    expect(response.body.status).toBe("refunded"); // >48h → full credit

    const promoted = await prisma.booking.findUniqueOrThrow({
      where: { id: oldestWaitlisted!.id },
    });
    expect(promoted.status).toBe("confirmed"); // mock provider auto-paid

    const seatHolders = await prisma.booking.count({
      where: { eventId, status: { in: ["pending_payment", "confirmed", "checked_in"] } },
    });
    expect(seatHolders).toBe(CAPACITY);
  });

  it("expires unpaid pending bookings and promotes from the waitlist", async () => {
    const victim = await prisma.booking.findFirst({
      where: { eventId, status: "confirmed" },
      orderBy: { createdAt: "desc" },
    });
    // Simulate a booking stuck unpaid for 20 minutes
    await prisma.$executeRaw`
      UPDATE bookings SET status = 'pending_payment', updated_at = now() - interval '20 minutes'
      WHERE id = ${victim!.id}::uuid`;
    const remainingWaitlisted = await prisma.booking.count({
      where: { eventId, status: "waitlisted" },
    });

    const expired = await bookings.expireStalePending();
    expect(expired).toBeGreaterThanOrEqual(1);

    const after = await prisma.booking.findUniqueOrThrow({ where: { id: victim!.id } });
    expect(after.status).toBe("cancelled");
    if (remainingWaitlisted > 0) {
      const seatHolders = await prisma.booking.count({
        where: { eventId, status: { in: ["pending_payment", "confirmed", "checked_in"] } },
      });
      expect(seatHolders).toBe(CAPACITY);
    }
  });
});
