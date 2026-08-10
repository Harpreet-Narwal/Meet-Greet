import { createHmac } from "node:crypto";

import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { env } from "../config/env";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

/*
 * The Razorpay webhook is the only thing that confirms a real seat — with a
 * live gateway nothing else flips a booking to `confirmed`. So "an unsigned or
 * wrongly-signed call cannot confirm a booking" is a critical invariant, and it
 * gets explicit tests (CLAUDE.md).
 */

const SECRET = "test-webhook-secret";

function makeController() {
  const handleWebhook = jest.fn().mockResolvedValue(undefined);
  const bookings = { handleWebhook } as unknown as BookingsService; // only handleWebhook is exercised
  return { controller: new BookingsController(bookings), handleWebhook };
}

function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(Buffer.from(body)).digest("hex");
}

function paidBody(linkId = "plink_123"): string {
  return JSON.stringify({
    event: "payment_link.paid",
    payload: { payment_link: { entity: { id: linkId } } },
  });
}

describe("BookingsController — razorpay webhook", () => {
  const original = env.RAZORPAY_WEBHOOK_SECRET;
  beforeEach(() => {
    env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  });
  afterAll(() => {
    env.RAZORPAY_WEBHOOK_SECRET = original;
  });

  it("confirms the booking when the signature matches", async () => {
    const { controller, handleWebhook } = makeController();
    const body = paidBody();
    await controller.razorpayWebhook({ rawBody: Buffer.from(body) }, sign(body));
    expect(handleWebhook).toHaveBeenCalledWith("plink_123", "paid");
  });

  it("rejects a body signed with the wrong secret", async () => {
    const { controller, handleWebhook } = makeController();
    const body = paidBody();
    await expect(
      controller.razorpayWebhook({ rawBody: Buffer.from(body) }, sign(body, "not-the-secret")),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it("rejects a tampered body whose signature was valid for the original", async () => {
    const { controller, handleWebhook } = makeController();
    // Signature computed over the real payload, then the id swapped — the shape
    // a replay would take if we verified a re-serialised object.
    const signature = sign(paidBody("plink_cheap"));
    await expect(
      controller.razorpayWebhook({ rawBody: Buffer.from(paidBody("plink_expensive")) }, signature),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it("rejects a missing signature", async () => {
    const { controller, handleWebhook } = makeController();
    await expect(
      controller.razorpayWebhook({ rawBody: Buffer.from(paidBody()) }, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it("fails closed when no webhook secret is configured", async () => {
    env.RAZORPAY_WEBHOOK_SECRET = undefined;
    const { controller, handleWebhook } = makeController();
    const body = paidBody();
    await expect(
      controller.razorpayWebhook({ rawBody: Buffer.from(body) }, sign(body)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it("rejects a garbage signature without throwing from timingSafeEqual", async () => {
    const { controller } = makeController();
    // Different length than the digest: timingSafeEqual throws rather than
    // returning false, so the length guard has to come first.
    await expect(
      controller.razorpayWebhook({ rawBody: Buffer.from(paidBody()) }, "abcd"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("acknowledges unmodelled events instead of forcing a retry loop", async () => {
    const { controller, handleWebhook } = makeController();
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    await expect(
      controller.razorpayWebhook({ rawBody: Buffer.from(body) }, sign(body)),
    ).resolves.toEqual({ received: true, ignored: true });
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it("marks the payment failed when the link is cancelled", async () => {
    const { controller, handleWebhook } = makeController();
    const body = JSON.stringify({
      event: "payment_link.cancelled",
      payload: { payment_link: { entity: { id: "plink_9" } } },
    });
    await controller.razorpayWebhook({ rawBody: Buffer.from(body) }, sign(body));
    expect(handleWebhook).toHaveBeenCalledWith("plink_9", "failed");
  });

  it("rejects a request with no body", async () => {
    const { controller } = makeController();
    await expect(
      controller.razorpayWebhook({ rawBody: undefined }, sign("{}")),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
