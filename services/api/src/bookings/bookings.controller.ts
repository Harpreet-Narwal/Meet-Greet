import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { Public } from "../auth/public.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { BookingsService } from "./bookings.service";
import { TwoTruthsSchema, type TwoTruthsDto } from "./bookings.types";

const WebhookSchema = z.object({
  provider_order_id: z.string().min(4),
  outcome: z.enum(["paid", "failed"]),
});

@ApiTags("bookings")
@ApiBearerAuth()
@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post("events/:id/bookings")
  @ApiOperation({ summary: "Book a seat (full table → waitlist). Mock payments auto-confirm." })
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
}
