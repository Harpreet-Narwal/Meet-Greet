import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { QuizService } from "./quiz.service";
import { SubmitResponsesSchema, type SubmitResponsesDto } from "./quiz.types";

@ApiTags("quiz")
@ApiBearerAuth()
@Controller("quiz")
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Get()
  @ApiOperation({ summary: "Active quiz for a locale (scoring weights stay server-side)" })
  getQuiz(@Query("locale") locale?: string) {
    return this.quiz.getActiveQuiz(locale ?? "en");
  }

  @Post("responses")
  @ApiOperation({ summary: "Submit answers → ai computes traits → archetype persisted" })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SubmitResponsesSchema)) body: SubmitResponsesDto,
  ) {
    return this.quiz.submitResponses(user.id, body);
  }
}
