import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, ButtonLink, Card, Logo } from "@mulaqat/ui";
import { BRAND_NAME_DISPLAY } from "@mulaqat/types";

import { formatINR } from "@/lib/format";
import { APP_URL } from "@/lib/config";
import {
  EVENT_TYPE_LABELS,
  formatEventDate,
  publicApi,
  type PublicEvent,
} from "@/lib/public-api";

export const revalidate = 300; // ISR — plan §8

interface Params {
  params: Promise<{ slug: string }>;
}

async function getEvent(slug: string): Promise<PublicEvent | null> {
  return publicApi<PublicEvent>(`/events/${slug}`);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  // Keep the page crawlable (title + description) even if the fetch times out.
  if (!event) {
    return {
      title: "A Mulaqat table",
      description:
        "A curated table of six in Bengaluru — dinners, run clubs, game nights and chai, matched by personality. Venue revealed 24 hours before.",
      alternates: { canonical: `/events/${slug}` },
    };
  }
  const description = `${EVENT_TYPE_LABELS[event.type]} in Bengaluru — ${formatEventDate(event.starts_at)} IST. ${event.description.slice(0, 140)}`;
  const ogImage = `/og/event?${new URLSearchParams({
    title: event.title,
    type: event.type,
    when: formatEventDate(event.starts_at),
  }).toString()}`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: { title: event.title, description, type: "website", images: [ogImage] },
    twitter: { card: "summary_large_image", title: event.title, description, images: [ogImage] },
  };
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const isPast = new Date(event.starts_at).getTime() < Date.now();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.starts_at,
    endDate: new Date(
      new Date(event.starts_at).getTime() + event.duration_min * 60_000,
    ).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue?.name ?? `${BRAND_NAME_DISPLAY} table — venue revealed 24h before`,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venue?.address ?? event.neighborhood_teaser ?? "Bengaluru",
        addressLocality: "Bengaluru",
        addressCountry: "IN",
      },
    },
    organizer: { "@type": "Organization", name: BRAND_NAME_DISPLAY, url: APP_URL },
    offers: {
      "@type": "Offer",
      price: event.price_inr,
      priceCurrency: "INR",
      availability:
        event.seats_left > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: `${APP_URL}/events/${event.slug}`,
    },
  };

  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="nav-blur sticky top-0 z-50 border-b border-line/60">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3.5">
          <Link href="/" aria-label="Mulaqat home">
            <Logo size={26} />
          </Link>
          <ButtonLink href="/explore" variant="ghost" size="sm">
            All tables
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{EVENT_TYPE_LABELS[event.type]}</Badge>
          {event.women_only ? <Badge tone="sage">Women only</Badge> : null}
          {event.seats_left === 0 && !isPast ? <Badge tone="neutral">Waitlist open</Badge> : null}
        </div>
        <h1 className="mt-5 text-[clamp(2rem,5vw,2.75rem)] font-bold leading-tight tracking-tight">
          {event.title}
        </h1>
        <p className="mt-3 text-[17px] font-medium">
          {formatEventDate(event.starts_at)} IST
          <span className="text-ink-soft"> · {event.duration_min} min</span>
        </p>

        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          {event.description}
        </p>

        <Card large className="mt-8 p-6">
          {event.venue ? (
            <>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-sage">
                Venue revealed
              </p>
              <p className="mt-1 text-lg font-bold">{event.venue.name}</p>
              <p className="mt-0.5 text-[15px] text-ink-soft">
                {event.venue.address}, {event.venue.neighborhood}
              </p>
            </>
          ) : (
            <>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">
                Venue revealed 24 hours before
              </p>
              <p className="mt-1 text-lg font-bold">
                {event.neighborhood_teaser ?? "Somewhere worth the auto ride"}
              </p>
              <p className="mt-0.5 text-[15px] text-ink-soft">
                The mystery is part of the fun — you&apos;ll get the exact spot the day before.
              </p>
            </>
          )}
        </Card>

        {!isPast ? (
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href={`/events/${event.slug}/book`} size="lg" data-testid="book-cta">
              {event.seats_left > 0
                ? `Book a seat · ${event.price_inr === 0 ? "Free" : formatINR(event.price_inr)}`
                : "Join the waitlist"}
            </ButtonLink>
            <p className="text-[14px] text-ink-soft">
              {event.seats_left > 0
                ? `${event.seats_left} of ${event.seats_total} seats open`
                : "Cancellations free up seats surprisingly often"}
            </p>
          </div>
        ) : (
          <p className="mt-8 text-[15px] font-medium text-ink-soft">
            This one&apos;s already happened — the group chat is probably still going.
          </p>
        )}
      </main>
    </div>
  );
}
