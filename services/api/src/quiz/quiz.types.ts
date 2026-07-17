import { z } from "zod";

/** One option of a stored quiz question (quiz_questions.options JSON). */
export interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
  trait_weights?: Record<string, number>;
  humor?: string;
  /** Facet value for enum facets (dietary, relationship_intent). */
  value?: string;
  /** Fun tag (chai/coffee closer) — share-card fodder, zero trait weight. */
  tag?: string;
}

export const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single"),
    question_id: z.string().uuid(),
    option_id: z.string(),
  }),
  z.object({
    kind: z.literal("either_or"),
    question_id: z.string().uuid(),
    option_id: z.string(),
  }),
  z.object({
    kind: z.literal("multi"),
    question_id: z.string().uuid(),
    option_ids: z.array(z.string()).min(1).max(8),
  }),
  z.object({
    kind: z.literal("slider"),
    question_id: z.string().uuid(),
    value: z.number().min(-1).max(1),
  }),
]);

export const SubmitResponsesSchema = z.object({
  quiz_version: z.string().default("v1"),
  answers: z.array(AnswerSchema).min(1).max(30),
});

export type SubmitResponsesDto = z.infer<typeof SubmitResponsesSchema>;
export type AnswerDto = z.infer<typeof AnswerSchema>;
