import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, ButtonLink, Card, Logo } from "@mulaqat/ui";

import { EventCard } from "@/components/event-card";
import { apiFetch } from "@/lib/api";
import {
  EVENT_TYPE_LABELS,
  formatEventDate,
  publicApi,
  type PublicEvent,
} from "@/lib/public-api";

export const metadata: Metadata = {
  title: "Tonight",
  robots: { index: false },
};

interface BookingView {
  id: string;
  status: string;
  event: {
    id: string;
    slug: string;
    title: string;
    type: PublicEvent["type"];
    starts_at: string;
    status: string;
    neighborhood_teaser: string | null;
  };
}

function daysUntil(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export default async function TonightPage() {
  const { status, data } = await apiFetch<{ upcoming: BookingView[]; past: BookingView[] }>(
    "/me/bookings",
  );
  if (status === 401 || !data) redirect("/login?next=/tonight");

  const next = data.upcoming[0];
  const events = await publicApi<PublicEvent[]>("/events?city=bangalore", 120);
  const bookedEventIds = new Set(data.upcoming.map((booking) => booking.event.id));
  const recommendations = (events ?? []).filter((event) => !bookedEventIds.has(event.id)).slice(0, 6);

  return (
    <div className="min-h-dvh">
      <header className="nav-blur sticky top-0 z-50 border-b border-line/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/" aria-label="Mulaqat home">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-2">
            <ButtonLink href="/explore" variant="ghost" size="sm">
              Explore
            </ButtonLink>
            <ButtonLink href="/you" variant="secondary" size="sm">
              You
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        {next ? (
          <Card large className="relative overflow-hidden p-8" data-testid="next-booking">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{EVENT_TYPE_LABELS[next.event.type]}</Badge>
              <Badge tone={next.status === "waitlisted" ? "neutral" : "sage"}>
                {next.status === "waitlisted" ? "Waitlisted" : "Confirmed"}
              </Badge>
            </div>
            <h1 className="mt-4 text-[clamp(1.7rem,4vw,2.4rem)] font-bold leading-tight tracking-tight">
              {next.event.title}
            </h1>
            <p className="mt-2 text-[16px] font-medium">
              {formatEventDate(next.event.starts_at)} IST ·{" "}
              <span className="text-accent">{daysUntil(next.event.starts_at)}</span>
            </p>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
              {next.event.status === "revealed"
                ? "Venue's out! Check the event page for the address and your table teaser."
                : next.event.neighborhood_teaser
                  ? `${next.event.neighborhood_teaser} — exact venue drops 24 hours before.`
                  : "Venue drops 24 hours before. Keep the evening free."}
            </p>
            <div className="mt-6">
              <ButtonLink href={`/events/${next.event.slug}`} size="md">
                Event details
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <Card large className="p-8" data-testid="no-booking">
            <h1 className="text-[clamp(1.7rem,4vw,2.2rem)] font-bold leading-tight tracking-tight">
              No table yet — let&apos;s fix that.
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Your Wednesday self will thank your Monday self. Pick an evening below — dinner,
              a run, games or just chai.
            </p>
            <div className="mt-6">
              <ButtonLink href="/explore" size="lg">
                Find your table
              </ButtonLink>
            </div>
          </Card>
        )}

        {recommendations.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-xl font-bold tracking-tight">
              {next ? "While you wait…" : "This week in Bengaluru"}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
