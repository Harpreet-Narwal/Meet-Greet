import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ConnectionsService } from "./connections.service";
import { RatingsService } from "./ratings.service";

const ConnectionSchema = z.object({
  to_user: z.string().uuid(),
  kind: z.enum(["connect", "spark"]),
});
const RatingSchema = z.object({
  overall: z.number().int().min(1).max(5),
  host_rating: z.number().int().min(1).max(5).optional(),
  venue_rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(1000).optional(),
});

@ApiTags("connections")
@ApiBearerAuth()
@Controller()
export class ConnectionsController {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly ratings: RatingsService,
  ) {}

  @Get("events/:id/debrief")
  @ApiOperation({ summary: "Post-event: rate + your tablemates to Connect/Spark with" })
  debrief(@CurrentUser() user: AuthenticatedUser, @Param("id") eventId: string) {
    return this.ratings.debrief(user.id, eventId);
  }

  @Post("events/:id/ratings")
  @ApiOperation({ summary: "Rate the night (1-5)" })
  rate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") eventId: string,
    @Body(new ZodValidationPipe(RatingSchema)) body: z.infer<typeof RatingSchema>,
  ) {
    return this.ratings.rate(user.id, eventId, body);
  }

  @Post("events/:id/connections")
  @ApiOperation({ summary: "Connect or Spark a tablemate (one-sided Sparks never revealed)" })
  connect(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") eventId: string,
    @Body(new ZodValidationPipe(ConnectionSchema)) body: z.infer<typeof ConnectionSchema>,
  ) {
    return this.connections.send(user.id, eventId, body.to_user, body.kind);
  }

  @Get("me/connections")
  @ApiOperation({ summary: "Your connections (mutual + your outgoing; never incoming one-sided)" })
  mine(
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: "mutual" | "pending",
  ) {
    return this.connections.myConnections(user.id, status);
  }
}
