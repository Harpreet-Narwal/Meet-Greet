import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink, cn } from "@mulaqat/ui";

import { AppNav } from "@/components/app-nav";
import { EventCard } from "@/components/event-card";
import { EVENT_TYPE_LABELS, publicApi, type PublicEvent } from "@/lib/public-api";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Explore tables",
  description:
    "This week's dinners, run clubs, game nights and chai hours in Bengaluru — tables of six, matched by vibe.",
  alternates: { canonical: "/explore" },
};

const TYPES = ["dinner", "run_club", "game_night", "chai", "trek"] as const;
const BUDGETS: { value: string; label: string }[] = [
  { value: "budget", label: "₹" },
  { value: "moderate", label: "₹₹" },
  { value: "premium", label: "₹₹₹" },
];

interface Props {
  searchParams: Promise<{ type?: string; budget?: string }>;
}

export default async function ExplorePage({ searchParams }: Props) {
  const { type, budget } = await searchParams;
  const query = new URLSearchParams({ city: "bangalore" });
  if (type) query.set("type", type);
  if (budget) query.set("budget", budget);
  const events = await publicApi<PublicEvent[]>(`/events?${query.toString()}`, 120);

  const chipHref = (nextType?: string, nextBudget?: string) => {
    const params = new URLSearchParams();
    if (nextType) params.set("type", nextType);
    if (nextBudget) params.set("budget", nextBudget);
    const qs = params.toString();
    return qs ? `/explore?${qs}` : "/explore";
  };

  return (
    <div className="min-h-dvh">
      <AppNav active="explore" />

      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <h1 className="text-[clamp(1.9rem,4.5vw,2.6rem)] font-bold tracking-tight">
          This week&apos;s tables.
        </h1>

        {/* type chips */}
        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Link
            href={chipHref(undefined, budget)}
            className={cn(
              "rounded-card border px-4 py-2 text-[14px] font-medium transition-colors",
              !type ? "border-ink bg-ink text-paper" : "border-chip-beige bg-surface hover:border-ink",
            )}
          >
            Everything
          </Link>
          {TYPES.map((eventType) => (
            <Link
              key={eventType}
              href={chipHref(eventType, budget)}
              className={cn(
                "rounded-card border px-4 py-2 text-[14px] font-medium transition-colors",
                type === eventType
                  ? "border-ink bg-ink text-paper"
                  : "border-chip-beige bg-surface hover:border-ink",
              )}
            >
              {EVENT_TYPE_LABELS[eventType]}
            </Link>
          ))}
          <span className="mx-2 h-5 w-px bg-line" aria-hidden />
          {BUDGETS.map((band) => (
            <Link
              key={band.value}
              href={chipHref(type, budget === band.value ? undefined : band.value)}
              className={cn(
                "rounded-card border px-3.5 py-2 text-[14px] font-semibold transition-colors",
                budget === band.value
                  ? "border-ink bg-ink text-paper"
                  : "border-chip-beige bg-surface hover:border-ink",
              )}
            >
              {band.label}
            </Link>
          ))}
        </div>

        {events && events.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="event-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-14 max-w-md">
            <p className="text-lg font-bold">Nothing matches that combination — yet.</p>
            <p className="mt-2 text-[15px] text-ink-soft">
              Try widening the filters, or check back tomorrow. New tables drop through the week.
            </p>
            <ButtonLink href="/explore" variant="secondary" size="md" className="mt-5">
              Clear filters
            </ButtonLink>
          </div>
        )}

        <p className="mt-12 text-[13px] text-ink-soft">
          Prices cover curation and your host — food and drinks go straight to the restaurant.
        </p>
      </main>
    </div>
  );
}
