import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { MatchingService } from "./matching.service";
import { RevealService } from "./reveal.service";

const CheckinSchema = z.object({ qr_token: z.string().min(6) });

@ApiTags("admin")
@ApiBearerAuth()
@Roles("admin")
@UseGuards(RolesGuard)
@Controller("admin/events/:id")
export class AdminMatchingController {
  constructor(
    private readonly matching: MatchingService,
    private readonly reveal: RevealService,
  ) {}

  @Post("match")
  @ApiOperation({ summary: "Compose tables via the matching engine, persist assignments" })
  runMatch(@CurrentUser() user: AuthenticatedUser, @Param("id") eventId: string) {
    return this.matching.runForEvent(eventId, user.id);
  }

  @Get("match/explain")
  @ApiOperation({ summary: "Explain view — tables, members, chemistry breakdown" })
  explain(@Param("id") eventId: string) {
    return this.matching.explain(eventId);
  }

  @Post("reveal")
  @ApiOperation({ summary: "Manual venue-reveal override (T-24h job does this automatically)" })
  revealNow(@Param("id") eventId: string) {
    return this.reveal.revealEvent(eventId);
  }
}

@ApiTags("events")
@ApiBearerAuth()
@Controller("events/:id")
export class TableController {
  constructor(private readonly reveal: RevealService) {}

  @Get("my-table")
  @ApiOperation({ summary: "Post-reveal: venue card + table teaser (fills in as people check in)" })
  myTable(@CurrentUser() user: AuthenticatedUser, @Param("id") eventId: string) {
    return this.reveal.myTable(user.id, eventId);
  }

  @Get("checkin-token")
  @ApiOperation({ summary: "Your QR check-in token" })
  token(@CurrentUser() user: AuthenticatedUser, @Param("id") eventId: string) {
    return this.reveal.issueCheckinToken(user.id, eventId);
  }

  @Post("checkin")
  @ApiOperation({ summary: "Check in with a QR token → unlocks the game room" })
  checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") eventId: string,
    @Body(new ZodValidationPipe(CheckinSchema)) body: z.infer<typeof CheckinSchema>,
  ) {
    return this.reveal.checkIn(user.id, eventId, body.qr_token);
  }
}
