import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { DecksService } from "./decks.service";

const GenerateSchema = z.object({
  kind: z.enum(["icebreaker", "hot_takes", "most_likely", "trivia", "two_truths"]),
  level: z.number().int().min(1).max(3).optional(),
  locale: z.enum(["en", "hinglish"]).default("en"),
  count: z.number().int().min(1).max(30).default(10),
  context_tags: z.array(z.string()).max(8).default([]),
  title: z.string().min(3).max(120),
});

@ApiTags("admin")
@ApiBearerAuth()
@Roles("admin")
@UseGuards(RolesGuard)
@Controller("admin/decks")
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  @Post("generate")
  @ApiOperation({ summary: "RAG-generate a draft deck (needs LLM configured; 503 otherwise)" })
  generate(@Body(new ZodValidationPipe(GenerateSchema)) body: z.infer<typeof GenerateSchema>) {
    return this.decks.generate(body);
  }

  @Get("pending")
  @ApiOperation({ summary: "Moderation queue — draft decks awaiting approval" })
  pending() {
    return this.decks.pending();
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve a deck → cards safety_reviewed, deck goes live" })
  approve(@Param("id") id: string) {
    return this.decks.approve(id);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Reject a deck (retired + soft-deleted)" })
  reject(@Param("id") id: string) {
    return this.decks.reject(id);
  }
}
