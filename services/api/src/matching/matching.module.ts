import { Module } from "@nestjs/common";

import { AiClient } from "../ai/ai.client";
import { AdminMatchingController, TableController } from "./matching.controller";
import { MatchingService } from "./matching.service";
import { RevealService } from "./reveal.service";

@Module({
  controllers: [AdminMatchingController, TableController],
  providers: [MatchingService, RevealService, AiClient],
  exports: [MatchingService, RevealService],
})
export class MatchingModule {}
