import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ButtonLink, Logo } from "@mulaqat/ui";

import { EventCard } from "@/components/event-card";
import { publicApi, type PublicCity, type PublicEvent } from "@/lib/public-api";

export const revalidate = 300;

interface Params {
  params: Promise<{ city: string }>;
}

/** Title-cased slug — a readable fallback when the API is briefly unreachable. */
function cityNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city } = await params;
  const cities = await publicApi<PublicCity[]>("/cities");
  // Fall back to the slug rather than a description-less "not found" — every
  // public page must stay crawlable even if the catalogue fetch times out.
  const name = cities?.find((c) => c.slug === city)?.name ?? cityNameFromSlug(city);
  return {
    title: `Meet new people in ${name}`,
    description: `Personality-matched dinners, run clubs, game nights and chai meetups in ${name}. Tables of six, matched by vibe — no swiping, no small talk.`,
    alternates: { canonical: `/cities/${city}` },
  };
}

export default async function CityPage({ params }: Params) {
  const { city } = await params;
  const [cities, events] = await Promise.all([
    publicApi<PublicCity[]>("/cities"),
    publicApi<PublicEvent[]>(`/events?city=${city}`),
  ]);
  const match = cities?.find((c) => c.slug === city);
  if (!match) notFound();

  return (
    <div className="min-h-dvh">
      <header className="nav-blur sticky top-0 z-50 border-b border-line/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/" aria-label="Mulaqat home">
            <Logo size={26} />
          </Link>
          <ButtonLink href="/login" variant="secondary" size="sm">
            Sign in
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-14">
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight">
          Meet new people in {match.name}.
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          {match.is_live
            ? "Tables of six, matched by personality — dinners, run clubs, game nights and chai hours across the city."
            : `${match.name} is next on our list. Join the waitlist and bring the neighbourhood.`}
        </p>

        {match.is_live && events && events.length > 0 ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : match.is_live ? (
          <p className="mt-12 text-[15px] text-ink-soft">
            This week&apos;s tables are being set — check back tomorrow.
          </p>
        ) : (
          <div className="mt-10">
            <ButtonLink href="mailto:hello@mulaqat.app?subject=Bring%20mulaqat%20to%20my%20city" size="lg">
              Get early access
            </ButtonLink>
          </div>
        )}
      </main>
    </div>
  );
}
