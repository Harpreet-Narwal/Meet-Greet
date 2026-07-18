"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Card, LogoMark, cn } from "@mulaqat/ui";

import { getJson } from "@/lib/client";
import { useGameSocket, type GameState } from "@/lib/use-game-socket";

const GAMES: { kind: GameState["kind"]; label: string; emoji: string }[] = [
  { kind: "icebreaker", label: "Ice-breakers", emoji: "🃏" },
  { kind: "hot_takes", label: "Hot Takes", emoji: "🌶️" },
  { kind: "most_likely", label: "Most Likely To", emoji: "👀" },
  { kind: "trivia", label: "Desi Trivia", emoji: "🧠" },
  { kind: "two_truths", label: "Two Truths", emoji: "🕵️" },
];

const spring = { type: "spring", stiffness: 260, damping: 26 } as const;

export function GameRoom({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [tableId, setTableId] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { connected, state, error, emit } = useGameSocket(tableId);

  useEffect(() => {
    (async () => {
      const [table, meRes] = await Promise.all([
        getJson<{ table_id: string | null; checked_in: boolean }>(
          `/api/bff/events/${eventId}/my-table`,
        ),
        getJson<{ user: { id: string } }>("/api/bff/me"),
      ]);
      if (table.status === 401) return router.replace(`/login?next=/rooms/${eventId}`);
      if (!table.data?.table_id) return setLoadError("You don't have a table for this event yet.");
      if (!table.data.checked_in) return setLoadError("Check in at the venue to unlock the game room.");
      setTableId(table.data.table_id);
      setMe(meRes.data?.user.id ?? null);
    })();
  }, [eventId, router]);

  if (loadError) {
    return (
      <main className="min-h-dvh grid place-items-center px-6 text-center">
        <div>
          <LogoMark size={40} className="mx-auto text-ink" />
          <p className="mt-4 font-medium text-ink-soft">{loadError}</p>
          <Button className="mt-6" variant="secondary" onClick={() => router.push(`/tables/${eventId}`)}>
            Back to your table
          </Button>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <LogoMark size={40} className="animate-pulse text-ink" />
          <p>{connected ? "Joining your table…" : "Connecting…"}</p>
          {error ? <p className="text-danger">{error}</p> : null}
        </div>
      </main>
    );
  }

  const card = state.cards[state.cardIndex];
  const isStarter = me === state.startedBy;

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-dvh flex flex-col px-6 py-6">
        <header className="mx-auto flex w-full max-w-xl items-center justify-between">
          <LogoMark size={24} className="text-ink" />
          <div className="flex items-center gap-2 text-[13px] text-ink-soft">
            <span
              className={cn("size-2 rounded-full", connected ? "bg-sage" : "bg-danger")}
              aria-hidden
            />
            {state.players.length} at the table
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">
          {/* Lobby: pick a game */}
          {state.phase === "lobby" ? (
            <div data-testid="lobby">
              <h1 className="text-center text-2xl font-bold tracking-tight">Pick your first game.</h1>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {GAMES.map((game) => (
                  <button
                    key={game.kind}
                    onClick={() => emit("game:start", { deck_kind: game.kind, level: 1 })}
                    className="flex flex-col items-center gap-2 rounded-card-lg border border-line bg-surface p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    data-testid={`start-${game.kind}`}
                  >
                    <span className="text-3xl" aria-hidden>{game.emoji}</span>
                    <span className="text-[15px] font-semibold">{game.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Ended */}
          {state.phase === "ended" ? (
            <div className="text-center" data-testid="game-ended">
              <span className="text-5xl" aria-hidden>🎉</span>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">That&apos;s a wrap on this deck.</h1>
              <Button className="mt-6" onClick={() => emit("game:start", { deck_kind: "hot_takes" })}>
                Play something else
              </Button>
            </div>
          ) : null}

          {/* Active card */}
          {state.phase !== "lobby" && state.phase !== "ended" && card ? (
            <div>
              {/* level meter for icebreaker */}
              {state.kind === "icebreaker" ? (
                <div className="mb-6 flex items-center justify-center gap-2" data-testid="level-meter">
                  {[1, 2, 3].map((lvl) => (
                    <span
                      key={lvl}
                      className={cn(
                        "h-1.5 w-12 rounded-full transition-colors",
                        lvl <= state.level ? "bg-accent" : "bg-ink/10",
                      )}
                    />
                  ))}
                  <span className="ml-2 text-[13px] font-semibold text-accent">
                    {state.level === 3 ? "Going deep 🔥" : `Level ${state.level}`}
                  </span>
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -20 }}
                  transition={spring}
                >
                  <Card large className="px-7 py-12 text-center" data-testid="game-card">
                    <p className="text-[22px] font-bold leading-snug tracking-tight sm:text-[26px]">
                      {card.text}
                    </p>
                  </Card>
                </motion.div>
              </AnimatePresence>

              {/* Controls per phase/kind */}
              <div className="mt-7">
                {/* hot_takes vote */}
                {state.kind === "hot_takes" && state.phase === "voting" ? (
                  <div className="grid grid-cols-2 gap-3" data-testid="vote-ab">
                    <Button variant="secondary" onClick={() => emit("vote:cast", { choice: "agree" })}>
                      Agree 🙌
                    </Button>
                    <Button variant="secondary" onClick={() => emit("vote:cast", { choice: "disagree" })}>
                      Nope 🙅
                    </Button>
                  </div>
                ) : null}

                {/* most_likely / two_truths: vote for a player */}
                {(state.kind === "most_likely" || state.kind === "two_truths") &&
                state.phase === "voting" ? (
                  <div className="grid grid-cols-2 gap-2" data-testid="vote-players">
                    {state.players.map((p) => (
                      <Button
                        key={p.user_id}
                        variant="secondary"
                        size="sm"
                        onClick={() => emit("vote:cast", { choice: p.user_id })}
                      >
                        {p.first_name}
                      </Button>
                    ))}
                  </div>
                ) : null}

                {/* trivia answer */}
                {state.kind === "trivia" && state.phase === "card" ? (
                  <TriviaAnswer onAnswer={(a) => emit("card:answer", { answer: a })} />
                ) : null}

                {/* reveal → results + advance */}
                {state.phase === "reveal" ? (
                  <div data-testid="reveal">
                    <VoteResult state={state} />
                    <Button className="mt-5 w-full" onClick={() => emit("card:advance", {})}>
                      Next →
                    </Button>
                  </div>
                ) : null}

                {/* icebreaker: discuss then advance / go deeper */}
                {state.kind === "icebreaker" && state.phase === "card" ? (
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => emit("card:advance", {})} data-testid="advance">
                      Next card →
                    </Button>
                    {state.level < 3 ? (
                      <Button
                        variant="ghost"
                        onClick={() => emit("level:vote", { level: state.level + 1 })}
                        data-testid="go-deeper"
                      >
                        Go deeper 🔥 (vote)
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* host / starter can advance anytime */}
              {isStarter && state.phase !== "reveal" ? (
                <button
                  onClick={() => emit("card:advance", {})}
                  className="mt-6 w-full text-center text-[13px] font-medium text-ink-soft underline-offset-4 hover:underline"
                >
                  Skip this one
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </MotionConfig>
  );
}

function TriviaAnswer({ onAnswer }: { onAnswer: (a: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onAnswer(value.trim());
        setValue("");
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your answer"
        className="h-11 flex-1 rounded-card border border-line bg-paper px-4 outline-none focus-visible:border-accent"
        data-testid="trivia-input"
      />
      <Button type="submit">Buzz</Button>
    </form>
  );
}

function VoteResult({ state }: { state: GameState }) {
  const result = state.result as { counts?: Record<string, number>; winner?: string; lie?: string } | null;
  if (!result) return null;
  const nameFor = (id: string) => state.players.find((p) => p.user_id === id)?.first_name ?? id;

  if (state.kind === "trivia") {
    return (
      <Card className="p-5 text-center">
        <p className="text-[15px] font-semibold">
          {result.winner ? `${nameFor(result.winner)} got it! 🎉` : "Nobody nailed it."}
        </p>
        <p className="mt-1 text-[14px] text-ink-soft">Answer: {result.lie ?? state.cards[state.cardIndex]?.answer}</p>
      </Card>
    );
  }

  const counts = result.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return (
    <Card className="p-5" data-testid="vote-result">
      <div className="flex flex-col gap-3">
        {Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([choice, count]) => (
            <div key={choice}>
              <div className="flex justify-between text-[14px] font-medium">
                <span>
                  {state.kind === "hot_takes"
                    ? choice === "agree"
                      ? "Agree 🙌"
                      : "Nope 🙅"
                    : nameFor(choice)}
                </span>
                <span className="text-ink-soft">{count}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-ink/10">
                <motion.div
                  className="h-full rounded-full bg-accent-2"
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / total) * 100}%` }}
                  transition={spring}
                />
              </div>
            </div>
          ))}
      </div>
      {state.kind === "two_truths" && result.lie ? (
        <p className="mt-4 text-center text-[14px] font-semibold text-accent">
          The lie: {result.lie}
        </p>
      ) : null}
    </Card>
  );
}
