import Link from "next/link";

import { formatINR } from "@/lib/format";
import { EVENT_TYPE_LABELS, formatEventDate, type PublicEvent } from "@/lib/public-api";

/*
 * An event is a row in a typographic index, not a photo card (see
 * docs/design-system.md §6). Real crawlable text, no image LCP cost, and it
 * still reads at forty rows where a wall of cards would not.
 *
 * The row leads with the DATE because these listings are chronological — that
 * is the key the reader is actually scanning. A sequence number would look
 * editorial but encode nothing, and would renumber itself whenever a filter
 * changed.
 */
export function EventRow({ event }: { event: PublicEvent }) {
  const soldOut = event.seats_left === 0;
  const almostFull = event.seats_left > 0 && event.seats_left <= 3;

  const seats = soldOut
    ? "Waitlist open"
    : `${event.seats_left} seat${event.seats_left === 1 ? "" : "s"} left`;

  return (
    <Link
      href={`/events/${event.slug}`}
      aria-disabled={soldOut ? "true" : undefined}
      className="index-row grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:grid-cols-[15rem_1fr_11rem_5rem_8rem] md:py-6"
    >
      {/* One line per row on desktop: every cell sits in row 1, and the date
          column is wide enough that the timezone never orphans onto line 2. */}
      <span className="label col-start-1 row-start-1 md:whitespace-nowrap">
        {formatEventDate(event.starts_at)} IST
      </span>

      {/* h2, not h3: on /explore and /cities/[city] this list follows the h1
          directly, and skipping a level trips the heading-order a11y audit. */}
      <h2 className="col-span-2 col-start-1 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1">
        <span className="index-name display text-h3">{event.title}</span>
      </h2>

      <span className="label col-start-1 row-start-3 md:col-start-3 md:row-start-1 md:text-right">
        {EVENT_TYPE_LABELS[event.type]}
        {event.women_only ? " · Women only" : ""}
      </span>

      <span className="label col-start-2 row-start-1 !text-ink md:col-start-4 md:row-start-1 md:text-right">
        {event.price_inr === 0 ? "Free" : formatINR(event.price_inr)}
      </span>

      <span
        className={`label col-start-2 row-start-3 md:col-start-5 md:row-start-1 md:whitespace-nowrap md:text-right ${
          almostFull ? "!text-accent-ink" : ""
        }`}
      >
        {seats}
      </span>
    </Link>
  );
}
