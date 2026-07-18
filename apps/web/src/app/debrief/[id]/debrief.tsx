"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Card, LogoMark } from "@mulaqat/ui";

import { getJson, postJson } from "@/lib/client";

interface Tablemate {
  user_id: string;
  first_name: string | null;
  archetype: string | null;
  archetype_emoji: string | null;
  i_connected: boolean;
  i_sparked: boolean;
}
interface DebriefData {
  event_id: string;
  already_rated: boolean;
  i_am_open_to_dating: boolean;
  tablemates: Tablemate[];
}

export function Debrief({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [data, setData] = useState<DebriefData | null>(null);
  const [step, setStep] = useState<"rate" | "connect">("rate");
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sparked, setSparked] = useState<Record<string, boolean>>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [mutualSpark, setMutualSpark] = useState<Tablemate | null>(null);

  useEffect(() => {
    (async () => {
      const res = await getJson<DebriefData>(`/api/bff/events/${eventId}/debrief`);
      if (res.status === 401) return router.replace(`/login?next=/debrief/${eventId}`);
      if (!res.data) return setError("Couldn't load the debrief.");
      setData(res.data);
      if (res.data.already_rated) setStep("connect");
      const s: Record<string, boolean> = {};
      const c: Record<string, boolean> = {};
      for (const t of res.data.tablemates) {
        s[t.user_id] = t.i_sparked;
        c[t.user_id] = t.i_connected;
      }
      setSparked(s);
      setConnected(c);
    })();
  }, [eventId, router]);

  async function submitRating() {
    if (rating === 0) return;
    setBusy(true);
    const res = await postJson(`/api/bff/events/${eventId}/ratings`, { overall: rating });
    setBusy(false);
    if (!res.ok) return setError(res.message ?? "Couldn't save your rating.");
    setStep("connect");
  }

  async function send(mate: Tablemate, kind: "connect" | "spark") {
    const res = await postJson<{ status: "pending" | "mutual" }>(
      `/api/bff/events/${eventId}/connections`,
      { to_user: mate.user_id, kind },
    );
    if (!res.ok) return setError(res.message ?? "That didn't send.");
    if (kind === "spark") setSparked((p) => ({ ...p, [mate.user_id]: true }));
    else setConnected((p) => ({ ...p, [mate.user_id]: true }));
    if (res.data?.status === "mutual" && kind === "spark") setMutualSpark(mate);
  }

  if (error && !data) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <p role="alert" className="font-medium text-danger">{error}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <LogoMark size={40} className="animate-pulse text-ink" />
      </main>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-dvh px-6 py-12">
        <div className="mx-auto w-full max-w-md">
          {step === "rate" ? (
            <Card large className="p-8 text-center" data-testid="rate-step">
              <LogoMark size={34} className="mx-auto text-ink" />
              <h1 className="mt-6 text-2xl font-bold tracking-tight">How was the night?</h1>
              <p className="mt-2 text-[15px] text-ink-soft">
                Private — it just helps us seat you better next time.
              </p>
              <div className="mt-7 flex items-center justify-center gap-2" role="group" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className="text-4xl transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    data-testid={`star-${n}`}
                  >
                    <span className={n <= rating ? "" : "opacity-25"}>⭐</span>
                  </button>
                ))}
              </div>
              <Button className="mt-8 w-full" size="lg" disabled={rating === 0 || busy} onClick={submitRating} data-testid="submit-rating">
                {busy ? "Saving…" : "Next: your table"}
              </Button>
            </Card>
          ) : (
            <div data-testid="connect-step">
              <h1 className="text-2xl font-bold tracking-tight">Keep the good ones.</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                Connect to stay friends. {data.i_am_open_to_dating ? "Spark if it was something more — they'll only know if they Spark you back." : "Turn on 'open to dating' in your profile to Spark."}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {data.tablemates.map((mate) => (
                  <Card key={mate.user_id} className="flex items-center gap-4 p-4">
                    <span className="text-3xl" aria-hidden>{mate.archetype_emoji ?? "🙂"}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{mate.first_name}</p>
                      {mate.archetype ? (
                        <p className="text-[13px] text-ink-soft">{mate.archetype}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={connected[mate.user_id] ? "primary" : "secondary"}
                        size="sm"
                        disabled={connected[mate.user_id]}
                        onClick={() => send(mate, "connect")}
                        data-testid={`connect-${mate.user_id}`}
                      >
                        {connected[mate.user_id] ? "Connected" : "Connect"}
                      </Button>
                      {data.i_am_open_to_dating ? (
                        <Button
                          variant={sparked[mate.user_id] ? "primary" : "secondary"}
                          size="sm"
                          disabled={sparked[mate.user_id]}
                          onClick={() => send(mate, "spark")}
                          data-testid={`spark-${mate.user_id}`}
                        >
                          {sparked[mate.user_id] ? "Sparked ✨" : "Spark ✨"}
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
              <Button className="mt-8 w-full" variant="ghost" onClick={() => router.push("/people")}>
                Done — see my people
              </Button>
            </div>
          )}
          {error ? <p role="alert" className="mt-4 text-center text-[14px] text-danger">{error}</p> : null}
        </div>

        {/* Mutual Spark — full-screen saffron glow, classy, no confetti spam */}
        <AnimatePresence>
          {mutualSpark ? (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background:
                  "radial-gradient(circle at center, color-mix(in srgb, var(--accent-2) 40%, transparent), color-mix(in srgb, var(--ink) 88%, transparent))",
              }}
              onClick={() => setMutualSpark(null)}
              data-testid="mutual-spark"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="text-center text-paper"
              >
                <span className="text-6xl" aria-hidden>✨</span>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">It&apos;s a Spark!</h2>
                <p className="mt-2 text-lg opacity-90">
                  You and {mutualSpark.first_name} both felt it. A chat just opened.
                </p>
                <Button
                  variant="paper"
                  size="lg"
                  className="mt-7"
                  onClick={() => router.push("/people")}
                >
                  Say hi
                </Button>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
