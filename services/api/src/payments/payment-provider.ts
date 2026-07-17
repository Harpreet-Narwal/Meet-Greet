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
  async createOrder(_amountInr: number, reference: string): Promise<CreatedOrder> {
    return {
      provider: "mock",
      provider_order_id: `mock_${reference}_${randomUUID().slice(0, 8)}`,
      auto_paid: true,
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
