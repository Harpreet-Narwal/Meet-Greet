import type { Metadata } from "next";

import { Badge, ButtonLink, Card } from "@mulaqat/ui";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Events from free run clubs to ₹399 dinners. Membership like a social club: Free forever, Plus at ₹499/month, Concierge at ₹1,499/month. Safety is never a paid feature.",
  alternates: { canonical: "/pricing" },
};

const EVENTS = [
  { name: "Run Club Sundays", price: "Free", note: "Easy 5k + breakfast optional" },
  { name: "Chai & Chill", price: formatINR(99), note: "One weekday hour, full charm" },
  { name: "Game Nights", price: formatINR(199), note: "Boards, trivia, loud laughter" },
  { name: "Dinner for Six", price: formatINR(399), note: "The signature. Wed & Sat 8 PM" },
];

const TIERS = [
  {
    tier: "Free",
    price: "₹0",
    cadence: "forever",
    blurb: "Everything you need for a great first table.",
    points: [
      "Book any event at full price",
      "3 Connects per event",
      "Sparks — never capped, never paywalled",
      "Your personality card + history",
    ],
    cta: { href: "/explore", label: "Find your table" },
    highlight: false,
  },
  {
    tier: "Plus",
    price: formatINR(499),
    cadence: "per month · or ₹2,999/yr",
    blurb: "For the ones who never miss a Wednesday.",
    points: [
      "Unlimited Connects",
      "See who Sparked you — mutuals surface first",
      "Priority seats on sold-out tables",
      "Advanced filters (age, language)",
    ],
    cta: { href: "/login?next=/you", label: "Go Plus" },
    highlight: true,
  },
  {
    tier: "Concierge",
    price: formatINR(1499),
    cadence: "per month",
    blurb: "Your Wednesday, fully handled.",
    points: [
      "Everything in Plus",
      "Guaranteed weekly seat",
      "Premium venues",
      "Table-composition preferences",
    ],
    cta: { href: "/login?next=/you", label: "Talk to us" },
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-dvh">
      <MarketingNav />
      <main className="mx-auto w-full max-w-5xl px-6 py-16">
        <h1 className="text-[clamp(2.2rem,5vw,3.2rem)] font-bold leading-tight tracking-tight">
          Simple prices,<br /><span className="text-accent">honest ones.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          Booking fees cover curation and your host — food and drinks go straight to the
          restaurant, never marked up. Cancel more than 48 hours out for full credit.
        </p>

        {/* per-event prices */}
        <section className="mt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
            Per event
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EVENTS.map((event) => (
              <Card key={event.name} className="p-5">
                <p className="text-2xl font-bold tracking-tight">{event.price}</p>
                <h3 className="mt-1 font-bold">{event.name}</h3>
                <p className="mt-0.5 text-[13px] text-ink-soft">{event.note}</p>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-[14px] text-ink-soft">
            First event? Your intro seat is {formatINR(99)} — the product sells itself after
            one good dinner.
          </p>
        </section>

        {/* membership */}
        <section className="mt-16">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
            Membership
          </h2>
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            {TIERS.map((plan) => (
              <Card
                key={plan.tier}
                large
                className={`flex h-full flex-col p-8 ${plan.highlight ? "border-accent/60 bg-accent/[0.04]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{plan.tier}</h3>
                  {plan.highlight ? <Badge tone="accent">Popular</Badge> : null}
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight">
                  {plan.price}
                  <span className="block text-[13px] font-normal text-ink-soft">{plan.cadence}</span>
                </p>
                <p className="mt-3 text-[14px] font-medium">{plan.blurb}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                  {plan.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-[14px] leading-snug">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href={plan.cta.href}
                  variant={plan.highlight ? "primary" : "secondary"}
                  size="md"
                  className="mt-6"
                >
                  {plan.cta.label}
                </ButtonLink>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-[14px] text-ink-soft">
            Safety features — verification, hosts, SOS, reporting — are free for everyone,
            always. We charge for experience and access, never for safety.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
