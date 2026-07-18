"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge, Button, Card, LogoMark } from "@mulaqat/ui";

import { getJson, postJson } from "@/lib/client";

interface Seat {
  first_name: string | null;
  archetype: string | null;
  archetype_emoji: string | null;
  fun_fact: string | null;
  checked_in: boolean;
  is_you: boolean;
}

interface MyTable {
  event_status: string;
  venue: { name: string; address: string; neighborhood: string; lat: number; lng: number } | null;
  neighborhood_teaser: string | null;
  starts_at: string;
  table_number: number | null;
  seats: Seat[];
  checked_in: boolean;
}

function useCountdown(target: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return "";
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "now";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function TableReveal({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [table, setTable] = useState<MyTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function load() {
    const result = await getJson<MyTable>(`/api/bff/events/${eventId}/my-table`);
    if (result.status === 401) return router.replace("/login?next=/events/" + eventId + "/table");
    if (!result.ok || !result.data) return setError("Couldn't load your table.");
    setTable(result.data);
  }

  useEffect(() => {
    void load();
    const poll = setInterval(load, 8000); // live teaser fill-in
    return () => clearInterval(poll);
  }, [eventId]);

  const countdown = useCountdown(table?.starts_at ?? null);
  const revealed = table ? ["revealed", "live", "completed"].includes(table.event_status) : false;

  async function checkIn() {
    setChecking(true);
    setError(null);
    const tokenRes = await getJson<{ qr_token: string }>(
      `/api/bff/events/${eventId}/checkin-token`,
    );
    if (!tokenRes.ok || !tokenRes.data) {
      setChecking(false);
      return setError("Couldn't get your check-in code.");
    }
    const res = await postJson(`/api/bff/events/${eventId}/checkin`, {
      qr_token: tokenRes.data.qr_token,
    });
    setChecking(false);
    if (!res.ok) return setError(res.message ?? "Check-in didn't work — find your host.");
    await load();
  }

  if (error && !table) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <p role="alert" className="font-medium text-danger">{error}</p>
      </main>
    );
  }
  if (!table) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <LogoMark size={40} className="animate-pulse text-ink" />
      </main>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-dvh px-6 py-12">
        <div className="mx-auto w-full max-w-lg">
          {/* Venue card — locked (countdown) → flip → revealed */}
          <div style={{ perspective: 1400 }}>
            <AnimatePresence mode="wait">
              {!revealed ? (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: 90 }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                >
                  <Card large className="p-8 text-center" data-testid="locked-card">
                    <span className="text-4xl" aria-hidden>🔒</span>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight">
                      Venue unlocks in
                    </h1>
                    <p className="mt-2 font-mono text-3xl font-bold text-accent" data-testid="countdown">
                      {countdown}
                    </p>
                    <p className="mt-4 text-[15px] text-ink-soft">
                      {table.neighborhood_teaser ?? "Somewhere worth the auto ride"} — the exact
                      spot drops 24 hours before.
                    </p>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                >
                  <Card large className="overflow-hidden" data-testid="venue-card">
                    <div className="bg-accent px-8 py-6 text-on-accent">
                      <Badge tone="spark" className="mb-3 bg-paper/25">Table {table.table_number}</Badge>
                      <h1 className="text-2xl font-bold tracking-tight">{table.venue?.name}</h1>
                      <p className="mt-1 text-[15px] opacity-90">
                        {table.venue?.address}, {table.venue?.neighborhood}
                      </p>
                    </div>
                    <div className="flex items-center justify-between px-8 py-4">
                      <span className="text-[14px] text-ink-soft">Starts in {countdown}</span>
                      <a
                        href={`https://maps.google.com/?q=${table.venue?.lat},${table.venue?.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] font-semibold text-accent underline-offset-4 hover:underline"
                      >
                        Directions →
                      </a>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Table teaser — silhouettes fill in as people check in */}
          <section className="mt-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
              Your table of {table.seats.length}
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-3" data-testid="table-teaser">
              {table.seats.map((seat, i) => (
                <motion.div
                  key={i}
                  layout
                  className={`flex flex-col items-center gap-2 rounded-card-lg border p-4 text-center transition-colors ${
                    seat.checked_in ? "border-sage/50 bg-sage/5" : "border-line bg-surface"
                  }`}
                >
                  <span className="text-3xl" aria-hidden>
                    {seat.checked_in ? (seat.archetype_emoji ?? "🙂") : "👤"}
                  </span>
                  <span className="text-[13px] font-semibold leading-tight">
                    {seat.is_you ? "You" : (seat.first_name ?? "Arriving…")}
                  </span>
                  {seat.fun_fact ? (
                    <span className="text-[11px] leading-tight text-ink-soft">{seat.fun_fact}</span>
                  ) : null}
                </motion.div>
              ))}
            </div>
          </section>

          {/* Check-in */}
          {revealed ? (
            <div className="mt-8">
              {table.checked_in ? (
                <Card className="flex items-center gap-3 p-5">
                  <Badge tone="sage">Checked in</Badge>
                  <span className="text-[15px] text-ink-soft">
                    You&apos;re in. The game room unlocks when your host kicks off.
                  </span>
                </Card>
              ) : (
                <Button size="lg" className="w-full" disabled={checking} onClick={checkIn} data-testid="checkin-btn">
                  {checking ? "Checking you in…" : "I'm here — check me in"}
                </Button>
              )}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-center text-[14px] font-medium text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </MotionConfig>
  );
}
