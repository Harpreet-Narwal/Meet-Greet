import { Module } from "@nestjs/common";

import { AiClient } from "../ai/ai.client";
import { DecksController } from "./decks.controller";
import { DecksService } from "./decks.service";

@Module({
  controllers: [DecksController],
  providers: [DecksService, AiClient],
})
export class DecksModule {}
