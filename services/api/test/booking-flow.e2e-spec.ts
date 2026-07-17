import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";

/** Public catalogue + the happy booking path against seeded events. */
describe("events & booking flow (e2e)", () => {
  let app: INestApplication;
  let token = "";
  let bookingId = "";
  const phone = `+9176${String(Date.now()).slice(-8)}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health", "ready"] });
    await app.init();
    const login = await request(app.getHttpServer())
      .post("/v1/auth/otp/verify")
      .send({ phone, code: "000000" })
      .expect(200);
    token = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists published upcoming events publicly, without auth", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/events?city=bangalore")
      .expect(200);
    expect(response.body.length).toBeGreaterThanOrEqual(5);
    for (const event of response.body) {
      expect(["published", "revealed", "live"]).toContain(event.status);
    }
  });

  it("hides the venue on unrevealed events in every response shape", async () => {
    const list = await request(app.getHttpServer()).get("/v1/events?city=bangalore").expect(200);
    const unrevealed = list.body.filter((event: { status: string }) => event.status === "published");
    expect(unrevealed.length).toBeGreaterThan(0);
    for (const event of unrevealed) {
      expect(event.venue).toBeNull();
    }
    const detail = await request(app.getHttpServer())
      .get(`/v1/events/${unrevealed[0].slug}`)
      .expect(200);
    expect(detail.body.venue).toBeNull();
    expect(JSON.stringify(detail.body)).not.toContain("address");
    expect(detail.body.neighborhood_teaser).toBeTruthy(); // teaser instead
  });

  it("filters by type and budget", async () => {
    const response = await request(app.getHttpServer())
      .get("/v1/events?city=bangalore&type=chai&budget=budget")
      .expect(200);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    for (const event of response.body) {
      expect(event.type).toBe("chai");
      expect(event.budget_band).toBe("budget");
    }
  });

  it("books the chai table: confirmed instantly on the mock provider", async () => {
    const list = await request(app.getHttpServer())
      .get("/v1/events?city=bangalore&type=chai")
      .expect(200);
    const event = list.body[0];
    const seatsBefore = event.seats_left;

    const booking = await request(app.getHttpServer())
      .post(`/v1/events/${event.id}/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(booking.body.status).toBe("confirmed");
    bookingId = booking.body.id;

    const detail = await request(app.getHttpServer()).get(`/v1/events/${event.slug}`).expect(200);
    expect(detail.body.seats_left).toBe(seatsBefore - 1);
  });

  it("rejects a double booking of the same table", async () => {
    const mine = await request(app.getHttpServer())
      .get("/v1/me/bookings")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const eventId = mine.body.upcoming[0].event.id;
    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/bookings`)
      .set("Authorization", `Bearer ${token}`)
      .expect(409);
  });

  it("collects two truths and a lie", async () => {
    const response = await request(app.getHttpServer())
      .post(`/v1/bookings/${bookingId}/two-truths`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        truths: ["I've run a half marathon in Ladakh", "I make a mean biryani"],
        lie: "I once met Rahul Dravid in an elevator",
      })
      .expect(201);
    expect(response.body.two_truths_submitted).toBe(true);
  });

  it("shows the booking under upcoming, then cancellation follows the 48h credit policy", async () => {
    const mine = await request(app.getHttpServer())
      .get("/v1/me/bookings")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const booking = mine.body.upcoming.find((b: { id: string }) => b.id === bookingId);
    expect(booking).toBeTruthy();

    const hoursToStart =
      (new Date(booking.event.starts_at).getTime() - Date.now()) / 3600000;
    const cancel = await request(app.getHttpServer())
      .delete(`/v1/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    // >48h before start → full credit (refunded); inside the window → cancelled
    expect(cancel.body.status).toBe(hoursToStart > 48 ? "refunded" : "cancelled");
  });

  it("admin CRUD is locked to admins", async () => {
    await request(app.getHttpServer())
      .post("/v1/admin/events")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(403);
  });
});
