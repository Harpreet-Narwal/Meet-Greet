import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, QuizQuestion } from "@prisma/client";

import { AiClient, type ProfileComputeResponse } from "../ai/ai.client";
import { PrismaService } from "../prisma/prisma.service";
import type { AnswerDto, QuizOption, SubmitResponsesDto } from "./quiz.types";

const FACET_PREFIX = "facet:";

interface ResolvedAnswer {
  question_id: string;
  weights: Record<string, number>;
  humor_styles: string[];
}

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiClient,
  ) {}

  async getActiveQuiz(locale = "en"): Promise<{
    version: string;
    locale: string;
    questions: {
      id: string;
      ord: number;
      kind: QuizQuestion["kind"];
      text: string;
      subtext: string | null;
      trait_key: string | null;
      options: { id: string; label: string; emoji?: string }[];
    }[];
  }> {
    const questions = await this.prisma.quizQuestion.findMany({
      where: { version: "v1", locale },
      orderBy: { ord: "asc" },
    });
    if (questions.length === 0) throw new NotFoundException("no active quiz — run make seed");
    return {
      version: "v1",
      locale,
      questions: questions.map((q) => ({
        id: q.id,
        ord: q.ord,
        kind: q.kind,
        text: q.text,
        subtext: q.subtext,
        trait_key: q.traitKey,
        // trait weights stay server-side — the client never sees scoring
        options: (q.options as unknown as QuizOption[]).map((o) => ({
          id: o.id,
          label: o.label,
          emoji: o.emoji,
        })),
      })),
    };
  }

  private resolveAnswer(
    question: QuizQuestion,
    answer: AnswerDto,
  ): { resolved: ResolvedAnswer; facets: Record<string, string | string[]> } {
    const options = question.options as unknown as QuizOption[];
    const weights: Record<string, number> = {};
    const humor: string[] = [];
    const facets: Record<string, string | string[]> = {};
    const facetKey = question.traitKey?.startsWith(FACET_PREFIX)
      ? question.traitKey.slice(FACET_PREFIX.length)
      : null;

    const applyOption = (optionId: string): QuizOption => {
      const option = options.find((o) => o.id === optionId);
      if (!option) {
        throw new BadRequestException(`unknown option '${optionId}' for question ${question.ord}`);
      }
      for (const [trait, weight] of Object.entries(option.trait_weights ?? {})) {
        weights[trait] = (weights[trait] ?? 0) + weight;
      }
      if (option.humor) humor.push(option.humor);
      return option;
    };

    if (answer.kind === "single" || answer.kind === "either_or") {
      if (question.kind !== answer.kind) {
        throw new BadRequestException(`question ${question.ord} is not ${answer.kind}`);
      }
      const option = applyOption(answer.option_id);
      if (facetKey && option.value) facets[facetKey] = option.value;
    } else if (answer.kind === "multi") {
      if (question.kind !== "multi") {
        throw new BadRequestException(`question ${question.ord} is not multi`);
      }
      const unique = [...new Set(answer.option_ids)];
      const picked = unique.map((id) => applyOption(id));
      if (facetKey) facets[facetKey] = picked.map((o) => o.value ?? o.label);
    } else {
      if (question.kind !== "slider" || !question.traitKey || facetKey) {
        throw new BadRequestException(`question ${question.ord} is not a slider`);
      }
      weights[question.traitKey] = answer.value;
    }

    return { resolved: { question_id: question.id, weights, humor_styles: humor }, facets };
  }

  /** Per-trait normalization ceiling from the quiz definition (deterministic). */
  private traitMax(questions: QuizQuestion[]): Record<string, number> {
    const max: Record<string, number> = {};
    for (const question of questions) {
      if (question.kind === "slider" && question.traitKey && !question.traitKey.startsWith(FACET_PREFIX)) {
        max[question.traitKey] = (max[question.traitKey] ?? 0) + 1;
        continue;
      }
      const options = question.options as unknown as QuizOption[];
      const perTrait: Record<string, number> = {};
      for (const option of options) {
        for (const [trait, weight] of Object.entries(option.trait_weights ?? {})) {
          perTrait[trait] = Math.max(perTrait[trait] ?? 0, Math.abs(weight));
        }
      }
      for (const [trait, value] of Object.entries(perTrait)) {
        max[trait] = (max[trait] ?? 0) + value;
      }
    }
    return max;
  }

  async submitResponses(
    userId: string,
    dto: SubmitResponsesDto,
  ): Promise<{ personality: ProfileComputeResponse }> {
    const questions = await this.prisma.quizQuestion.findMany({
      where: { version: dto.quiz_version },
    });
    if (questions.length === 0) throw new NotFoundException("no active quiz — run make seed");
    const byId = new Map(questions.map((q) => [q.id, q]));

    const resolvedAnswers: ResolvedAnswer[] = [];
    const facetUpdates: Record<string, string | string[]> = {};
    for (const answer of dto.answers) {
      const question = byId.get(answer.question_id);
      if (!question) throw new BadRequestException(`unknown question ${answer.question_id}`);
      const { resolved, facets } = this.resolveAnswer(question, answer);
      resolvedAnswers.push(resolved);
      Object.assign(facetUpdates, facets);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("account not found");

    const personality = await this.ai.computeProfile({
      quiz_version: dto.quiz_version,
      first_name: user.firstName,
      answers: resolvedAnswers,
      trait_max: this.traitMax(questions),
    });

    // Persist responses + profile + facet-driven profile fields atomically.
    const userFacetData: Prisma.UserUpdateInput = {};
    if (typeof facetUpdates.dietary === "string") {
      userFacetData.dietary = facetUpdates.dietary as never;
    }
    if (typeof facetUpdates.relationship_intent === "string") {
      userFacetData.relationshipIntent = facetUpdates.relationship_intent as never;
    }
    if (Array.isArray(facetUpdates.languages)) userFacetData.languages = facetUpdates.languages;
    if (Array.isArray(facetUpdates.interests)) userFacetData.interests = facetUpdates.interests;

    await this.prisma.$transaction([
      ...dto.answers.map((answer) =>
        this.prisma.quizResponse.upsert({
          where: { userId_questionId: { userId, questionId: answer.question_id } },
          create: { userId, questionId: answer.question_id, answer: answer as never },
          update: { answer: answer as never },
        }),
      ),
      this.prisma.personalityProfile.upsert({
        where: { userId },
        create: {
          userId,
          quizVersion: dto.quiz_version,
          traitEnergy: personality.traits.energy,
          traitDepth: personality.traits.depth,
          traitNovelty: personality.traits.novelty,
          traitStructure: personality.traits.structure,
          humorStyles: personality.humor_styles,
          archetype: personality.archetype,
          archetypeEmoji: personality.archetype_emoji,
          completedAt: new Date(),
        },
        update: {
          quizVersion: dto.quiz_version,
          traitEnergy: personality.traits.energy,
          traitDepth: personality.traits.depth,
          traitNovelty: personality.traits.novelty,
          traitStructure: personality.traits.structure,
          humorStyles: personality.humor_styles,
          archetype: personality.archetype,
          archetypeEmoji: personality.archetype_emoji,
          completedAt: new Date(),
        },
      }),
      this.prisma.user.update({ where: { id: userId }, data: userFacetData }),
    ]);

    return { personality };
  }
}
