import Link from "next/link";

import { Badge, Card } from "@mulaqat/ui";

import { formatINR } from "@/lib/format";
import { EVENT_TYPE_LABELS, formatEventDate, type PublicEvent } from "@/lib/public-api";

export function EventCard({ event }: { event: PublicEvent }) {
  const almostFull = event.seats_left > 0 && event.seats_left <= 3;
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-card-lg"
    >
      <Card
        large
        className="flex h-full flex-col p-6 transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:border-accent/40"
      >
        <div className="flex items-center gap-2">
          <Badge tone="accent">{EVENT_TYPE_LABELS[event.type]}</Badge>
          {event.women_only ? <Badge tone="sage">Women only</Badge> : null}
          {almostFull ? <Badge tone="spark">{event.seats_left} seats left</Badge> : null}
          {event.seats_left === 0 ? <Badge tone="neutral">Waitlist open</Badge> : null}
        </div>
        {/* h2, not h3: on /explore and /cities/[city] the grid follows the h1
            directly, and skipping a level trips the heading-order a11y audit. */}
        <h2 className="mt-4 text-lg font-bold leading-snug">{event.title}</h2>
        <p className="mt-1.5 text-[14px] text-ink-soft">{formatEventDate(event.starts_at)} IST</p>
        {event.neighborhood_teaser ? (
          <p className="mt-2 flex-1 text-[14px] leading-relaxed text-ink-soft">
            {event.neighborhood_teaser}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <p className="mt-4 text-[15px] font-semibold">
          {event.price_inr === 0 ? "Free" : formatINR(event.price_inr)}
          <span className="font-normal text-ink-soft"> · per seat</span>
        </p>
      </Card>
    </Link>
  );
}
