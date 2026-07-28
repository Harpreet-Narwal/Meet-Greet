import { randomUUID } from "node:crypto";

import { BadRequestException } from "@nestjs/common";

import { env } from "../config/env";

export interface CreatedOrder {
  provider: string;
  provider_order_id: string;
  /** Mock provider auto-succeeds so local flows never need a gateway. */
  auto_paid: boolean;
}

export interface PaymentProvider {
  createOrder(amountInr: number, reference: string): Promise<CreatedOrder>;
}

class MockPaymentProvider implements PaymentProvider {
  /*
   * Deliberately does NOT auto-pay. The order is created and the booking stays
   * `pending_payment` until something settles it — exactly the shape a real
   * gateway has. Previously this returned auto_paid, so a paid table booked
   * itself with no checkout step anywhere in the product and the whole paywall
   * was invisible.
   *
   * In dev the checkout screen settles it via POST /v1/bookings/:id/pay; with a
   * real provider the same transition happens on the webhook. Unpaid bookings
   * expire after 15 minutes via the existing booking-expiry job, so an
   * abandoned checkout releases the seat.
   */
  async createOrder(_amountInr: number, reference: string): Promise<CreatedOrder> {
    return {
      provider: "mock",
      provider_order_id: `mock_${reference}_${randomUUID().slice(0, 8)}`,
      auto_paid: false,
    };
  }
}

class RazorpayProvider implements PaymentProvider {
  async createOrder(): Promise<CreatedOrder> {
    // Real keys are wired only when asked (CLAUDE.md) — interface stays stable.
    throw new BadRequestException("razorpay provider is not wired yet — use PAYMENT_PROVIDER=mock");
  }
}

export function getPaymentProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER === "razorpay" ? new RazorpayProvider() : new MockPaymentProvider();
}
