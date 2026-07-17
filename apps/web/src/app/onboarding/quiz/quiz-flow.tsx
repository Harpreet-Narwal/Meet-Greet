"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button, Card, LogoMark, cn } from "@mulaqat/ui";

import { getJson, postJson } from "@/lib/client";

interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
}

interface QuizQuestion {
  id: string;
  ord: number;
  kind: "single" | "multi" | "slider" | "either_or";
  text: string;
  subtext: string | null;
  trait_key: string | null;
  options: QuizOption[];
}

type StoredAnswer =
  | { kind: "single" | "either_or"; question_id: string; option_id: string }
  | { kind: "multi"; question_id: string; option_ids: string[] }
  | { kind: "slider"; question_id: string; value: number };

const STORAGE_KEY = "mulaqat.quiz.v1";

/** Selection rules the seed content specifies per question. */
const MULTI_RULES: Record<number, { min: number; max: number }> = {
  9: { min: 1, max: 2 },
  10: { min: 3, max: 6 },
  12: { min: 1, max: 11 },
};

const spring = { type: "spring", stiffness: 300, damping: 30 } as const;

function loadStored(): Record<string, StoredAnswer> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, StoredAnswer>;
  } catch {
    return {};
  }
}

export function QuizFlow() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StoredAnswer>>({});
  const [multiPick, setMultiPick] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [quiz, me] = await Promise.all([
        getJson<{ questions: QuizQuestion[] }>("/api/bff/quiz"),
        getJson<{ user: { first_name: string | null } }>("/api/bff/me"),
      ]);
      if (cancelled) return;
      if (quiz.status === 401 || me.status === 401) {
        router.replace("/login");
        return;
      }
      if (!quiz.ok || !quiz.data) {
        setError("The quiz didn't load — refresh to try again.");
        return;
      }
      setQuestions(quiz.data.questions);
      setNeedsName(!me.data?.user.first_name);
      const stored = loadStored();
      setAnswers(stored);
      const firstUnanswered = quiz.data.questions.findIndex((q) => !stored[q.id]);
      setIndex(firstUnanswered === -1 ? quiz.data.questions.length - 1 : firstUnanswered);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const question = questions?.[index] ?? null;
  const progress = questions ? index / questions.length : 0;

  const persist = useCallback((next: Record<string, StoredAnswer>) => {
    setAnswers(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const submitAll = useCallback(
    async (final: Record<string, StoredAnswer>) => {
      setSubmitting(true);
      setError(null);
      const result = await postJson("/api/bff/quiz/responses", {
        quiz_version: "v1",
        answers: Object.values(final),
      });
      setSubmitting(false);
      if (!result.ok) {
        setError(result.message ?? "Couldn't save your answers — try once more.");
        return;
      }
      localStorage.removeItem(STORAGE_KEY);
      router.push("/onboarding/result");
    },
    [router],
  );

  const advance = useCallback(
    (answer: StoredAnswer) => {
      if (!questions) return;
      const next = { ...answers, [answer.question_id]: answer };
      persist(next);
      if (index + 1 < questions.length) {
        setIndex(index + 1);
        setMultiPick([]);
        setSliderValue(0);
      } else {
        void submitAll(next);
      }
    },
    [answers, index, persist, questions, submitAll],
  );

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    const result = await postJson("/api/bff/me", { first_name: trimmed }, "PATCH");
    if (!result.ok) {
      setError(result.message ?? "Couldn't save your name — try again.");
      return;
    }
    setNeedsName(false);
    setStarted(true);
  }

  if (error && !questions) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <p role="alert" className="text-danger font-medium">{error}</p>
      </main>
    );
  }

  if (!questions) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <div className="flex flex-col items-center gap-4 text-ink-soft">
          <LogoMark size={40} className="animate-pulse text-ink" />
          <p>Setting the table…</p>
        </div>
      </main>
    );
  }

  // Intro: name (only when missing) + what to expect
  if (!started) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6 py-16">
        <Card large className="w-full max-w-md p-8 sm:p-10">
          <LogoMark size={36} className="text-ink" />
          <h1 className="mt-6 text-[28px] font-bold tracking-tight">
            Five minutes. Fifteen questions. Zero wrong answers.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            This is how we pick your table — your energy, your humour, what you can talk
            about for an hour straight. Be honest, it's more fun that way.
          </p>
          {needsName ? (
            <form onSubmit={saveName} className="mt-8 flex flex-col gap-4">
              <label className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft" htmlFor="first-name">
                First things first — what do we call you?
              </label>
              <input
                id="first-name"
                type="text"
                autoComplete="given-name"
                required
                minLength={2}
                maxLength={40}
                placeholder="Your first name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 rounded-card border border-line bg-paper px-4 text-[17px] outline-none transition-colors focus-visible:border-accent"
                data-testid="name-input"
              />
              <Button type="submit" size="lg" data-testid="start-quiz">
                Let's go
              </Button>
            </form>
          ) : (
            <Button className="mt-8" size="lg" onClick={() => setStarted(true)} data-testid="start-quiz">
              Let's go
            </Button>
          )}
          {error ? (
            <p role="alert" className="mt-4 text-[14px] font-medium text-danger">{error}</p>
          ) : null}
        </Card>
      </main>
    );
  }

  const rules = question ? MULTI_RULES[question.ord] : undefined;
  const multiValid =
    !rules || (multiPick.length >= rules.min && multiPick.length <= rules.max);

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-dvh flex flex-col px-6 pb-12 pt-6">
      {/* progress */}
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-between text-[13px] font-semibold text-ink-soft">
          <LogoMark size={22} className="text-ink" />
          <span data-testid="quiz-progress">
            {Math.min(index + 1, questions.length)} / {questions.length}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${Math.max(progress * 100, 3)}%` }}
            transition={spring}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 items-center">
        <AnimatePresence mode="wait">
          {question ? (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -48 }}
              transition={spring}
              className="w-full py-10"
              data-testid={`question-${question.ord}`}
            >
              <h2 className="text-[24px] font-bold leading-snug tracking-tight sm:text-[28px]">
                {question.text}
              </h2>
              {question.subtext ? (
                <p className="mt-2 text-[14px] text-ink-soft">{question.subtext}</p>
              ) : null}

              {/* single / either_or — tap to answer, springy */}
              {(question.kind === "single" || question.kind === "either_or") && (
                <div
                  className={cn(
                    "mt-8 grid gap-3",
                    question.kind === "either_or" ? "sm:grid-cols-2" : "",
                  )}
                >
                  {question.options.map((option) => (
                    <motion.button
                      key={option.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() =>
                        advance({
                          kind: question.kind as "single" | "either_or",
                          question_id: question.id,
                          option_id: option.id,
                        })
                      }
                      className="flex items-center gap-4 rounded-card-lg border border-line bg-surface p-5 text-left shadow-soft transition-colors duration-150 hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      data-testid={`option-${option.id}`}
                    >
                      {option.emoji ? (
                        <span className="text-3xl" aria-hidden>
                          {option.emoji}
                        </span>
                      ) : null}
                      <span className="text-[16px] font-medium leading-snug">{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* multi — chips + continue */}
              {question.kind === "multi" && (
                <>
                  <div className="mt-8 flex flex-wrap gap-2.5">
                    {question.options.map((option) => {
                      const selected = multiPick.includes(option.id);
                      const atMax = rules ? multiPick.length >= rules.max : false;
                      return (
                        <motion.button
                          key={option.id}
                          whileTap={{ scale: 0.94 }}
                          aria-pressed={selected}
                          disabled={!selected && atMax}
                          onClick={() =>
                            setMultiPick((current) =>
                              selected
                                ? current.filter((id) => id !== option.id)
                                : [...current, option.id],
                            )
                          }
                          className={cn(
                            "rounded-full border px-4 py-2.5 text-[15px] font-medium transition-all duration-150",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                            "disabled:opacity-40",
                            selected
                              ? "border-accent bg-accent text-on-accent shadow-soft"
                              : "border-line bg-surface hover:border-accent/50",
                          )}
                          data-testid={`option-${option.id}`}
                        >
                          {option.emoji ? `${option.emoji} ` : ""}
                          {option.label}
                        </motion.button>
                      );
                    })}
                  </div>
                  <Button
                    className="mt-8"
                    size="lg"
                    disabled={!multiValid || multiPick.length === 0}
                    onClick={() =>
                      advance({ kind: "multi", question_id: question.id, option_ids: multiPick })
                    }
                    data-testid="continue"
                  >
                    {rules && multiPick.length < rules.min
                      ? `Pick ${rules.min - multiPick.length} more`
                      : "Continue"}
                  </Button>
                </>
              )}

              {/* slider */}
              {question.kind === "slider" && (
                <div className="mt-10">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={sliderValue}
                    onChange={(event) => setSliderValue(Number(event.target.value))}
                    className="w-full accent-accent"
                    aria-label={question.text}
                    data-testid="slider"
                  />
                  <div className="mt-3 flex justify-between gap-6 text-[13px] leading-snug text-ink-soft">
                    <span className="max-w-[45%]">{question.options[0]?.label}</span>
                    <span className="max-w-[45%] text-right">{question.options[1]?.label}</span>
                  </div>
                  <Button
                    className="mt-8"
                    size="lg"
                    onClick={() =>
                      advance({
                        kind: "slider",
                        question_id: question.id,
                        value: sliderValue / 100,
                      })
                    }
                    data-testid="continue"
                  >
                    Continue
                  </Button>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {submitting ? (
        <p className="mx-auto text-[14px] text-ink-soft">Reading your vibe…</p>
      ) : null}
      {error && questions ? (
        <p role="alert" className="mx-auto text-[14px] font-medium text-danger">{error}</p>
      ) : null}
    </main>
    </MotionConfig>
  );
}
