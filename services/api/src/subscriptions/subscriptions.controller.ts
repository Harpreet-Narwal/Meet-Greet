import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { SubscriptionsService } from "./subscriptions.service";

const SubscribeSchema = z.object({ tier: z.enum(["plus", "concierge"]) });

@ApiTags("membership")
@ApiBearerAuth()
@Controller("me/membership")
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: "Your membership tier + benefits" })
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.subs.mySubscription(user.id);
  }

  @Post("subscribe")
  @ApiOperation({ summary: "Subscribe (mock provider — auto-active)" })
  subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SubscribeSchema)) body: z.infer<typeof SubscribeSchema>,
  ) {
    return this.subs.subscribe(user.id, body.tier);
  }

  @Get("who-sparked-me")
  @ApiOperation({ summary: "Plus: your MUTUAL sparks (one-sided sparks never shown)" })
  whoSparked(@CurrentUser() user: AuthenticatedUser) {
    return this.subs.whoSparkedMe(user.id);
  }
}
