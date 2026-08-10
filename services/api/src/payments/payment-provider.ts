import { randomUUID } from "node:crypto";

import { BadRequestException } from "@nestjs/common";

import { env } from "../config/env";

export interface CreatedOrder {
  provider: string;
  provider_order_id: string;
  /** Mock provider auto-succeeds so local flows never need a gateway. */
  auto_paid: boolean;
  /**
   * Where the payer finishes the transaction. Null for mock, which settles via
   * POST /bookings/:id/pay. With a real gateway the client opens this.
   */
  checkout_url?: string | null;
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

/**
 * Razorpay via **Payment Links**, not the native checkout SDK.
 *
 * The SDK route (`react-native-razorpay`) is a native module, which Expo Go
 * cannot load — adopting it would force every tester onto a custom dev build.
 * A payment link is a plain https URL the client opens in the system browser,
 * so the same code path works in Expo Go, in a dev build, and on the web.
 *
 * UPI comes for free on that hosted page: it offers UPI QR, UPI ID (VPA), and
 * on a phone hands off to any installed UPI app via intent — alongside cards
 * and netbanking. That is what "UPI as well as Razorpay" means in practice;
 * UPI is a method inside the gateway, not a second gateway to integrate.
 *
 * The seat is NOT confirmed here. Razorpay calls the webhook, which is the only
 * thing that flips the booking — a client that never returns from the browser
 * must not be able to leave a seat unpaid-but-confirmed.
 */
class RazorpayProvider implements PaymentProvider {
  async createOrder(amountInr: number, reference: string): Promise<CreatedOrder> {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new BadRequestException(
        "PAYMENT_PROVIDER=razorpay needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET",
      );
    }
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString(
      "base64",
    );

    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Razorpay counts in paise.
        amount: amountInr * 100,
        currency: "INR",
        description: "Mulaqat — one seat at the table",
        reference_id: reference,
        // Surface UPI first; the hosted page still offers the rest.
        upi_link: false,
        notify: { sms: false, email: false },
        reminder_enable: false,
        callback_url: `${env.APP_URL}/you`,
        callback_method: "get",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new BadRequestException(`razorpay rejected the order: ${detail.slice(0, 200)}`);
    }
    const link = (await response.json()) as { id: string; short_url: string };
    return {
      provider: "razorpay",
      provider_order_id: link.id,
      auto_paid: false,
      checkout_url: link.short_url,
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER === "razorpay" ? new RazorpayProvider() : new MockPaymentProvider();
}
