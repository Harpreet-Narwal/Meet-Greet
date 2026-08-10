import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { Public } from "../auth/public.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { env } from "../config/env";
import { BookingsService } from "./bookings.service";
import { TwoTruthsSchema, type TwoTruthsDto } from "./bookings.types";

const WebhookSchema = z.object({
  provider_order_id: z.string().min(4),
  outcome: z.enum(["paid", "failed"]),
});

/** Only the slice of Razorpay's payload we act on; everything else is ignored. */
const RazorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment_link: z.object({ entity: z.object({ id: z.string() }) }).optional(),
  }),
});

@ApiTags("bookings")
@ApiBearerAuth()
@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post("events/:id/bookings")
  @ApiOperation({ summary: "Book a seat (full table → waitlist). Paid seats start pending_payment." })
  book(@CurrentUser() user: AuthenticatedUser, @Param("id") eventId: string) {
    return this.bookings.book(user.id, eventId);
  }

  @Get("me/bookings")
  @ApiOperation({ summary: "Your upcoming + past bookings" })
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookings.myBookings(user.id);
  }

  @Post("bookings/:id/two-truths")
  @ApiOperation({ summary: "Two truths & a lie for the table game" })
  twoTruths(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") bookingId: string,
    @Body(new ZodValidationPipe(TwoTruthsSchema)) body: TwoTruthsDto,
  ) {
    return this.bookings.submitTwoTruths(user.id, bookingId, body);
  }

  @Post("bookings/:id/pay")
  @ApiOperation({ summary: "Settle a mock checkout (dev build) — confirms the seat" })
  pay(@CurrentUser() user: AuthenticatedUser, @Param("id") bookingId: string) {
    return this.bookings.payMock(user.id, bookingId);
  }

  @Delete("bookings/:id")
  @ApiOperation({ summary: "Cancel — >48h before start earns a full credit" })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") bookingId: string) {
    return this.bookings.cancel(user.id, bookingId);
  }

  @Public()
  @Post("payments/webhook")
  @HttpCode(200)
  @ApiOperation({ summary: "Provider webhook (mock fires it implicitly)" })
  async webhook(@Body(new ZodValidationPipe(WebhookSchema)) body: z.infer<typeof WebhookSchema>) {
    await this.bookings.handleWebhook(body.provider_order_id, body.outcome);
    return { received: true };
  }

  /**
   * Razorpay's webhook. Separate from the generic one above because the payload
   * is Razorpay-shaped and, unlike the dev endpoint, it is authenticated — this
   * is the only thing that confirms a real seat, so an unsigned caller must not
   * be able to reach it.
   */
  @Public()
  @Post("payments/razorpay/webhook")
  @HttpCode(200)
  @ApiOperation({ summary: "Razorpay webhook — signature-verified" })
  async razorpayWebhook(
    @Req() request: { rawBody?: Buffer },
    @Headers("x-razorpay-signature") signature: string | undefined,
  ) {
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    // Fail closed. An unconfigured secret means we cannot tell a real callback
    // from a forged one, and guessing would confirm seats for free.
    if (!secret) throw new UnauthorizedException("razorpay webhook secret is not configured");
    if (!signature) throw new UnauthorizedException("missing signature");
    if (!request.rawBody) throw new BadRequestException("missing body");

    const expected = createHmac("sha256", secret).update(request.rawBody).digest();
    const provided = Buffer.from(signature, "hex");
    // Length check first: timingSafeEqual throws on a mismatch rather than
    // returning false, and the length itself is not a secret.
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(new Uint8Array(provided), new Uint8Array(expected))
    ) {
      throw new UnauthorizedException("bad signature");
    }

    const parsed = RazorpayWebhookSchema.safeParse(JSON.parse(request.rawBody.toString("utf8")));
    // Razorpay retries on non-2xx. Events we do not model are not failures, so
    // acknowledge them rather than inviting an endless retry loop.
    if (!parsed.success) return { received: true, ignored: true };

    const { event, payload } = parsed.data;
    const linkId = payload.payment_link?.entity.id;
    if (!linkId) return { received: true, ignored: true };

    if (event === "payment_link.paid") {
      await this.bookings.handleWebhook(linkId, "paid");
    } else if (event === "payment_link.cancelled" || event === "payment_link.expired") {
      await this.bookings.handleWebhook(linkId, "failed");
    }
    return { received: true };
  }
}
