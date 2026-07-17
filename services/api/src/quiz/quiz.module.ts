import { Module } from "@nestjs/common";

import { AiClient } from "../ai/ai.client";
import { QuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";

@Module({
  controllers: [QuizController],
  providers: [QuizService, AiClient],
})
export class QuizModule {}
