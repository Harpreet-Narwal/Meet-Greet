import type { Metadata } from "next";

import { ButtonLink, Card } from "@mulaqat/ui";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Take a 5-minute personality quiz, get matched into a table of six, watch the venue reveal at T-24h, and play ice-breakers built into the table. Here's the whole journey.",
  alternates: { canonical: "/how-it-works" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does Mulaqat match people?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A 5-minute personality quiz measures energy, depth, novelty and structure plus your interests, humour and languages. A deterministic matching engine composes tables of six that balance common ground with complementary personalities.",
      },
    },
    {
      "@type": "Question",
      name: "When do I find out the venue?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "24 hours before the event. Until then you see only the neighbourhood and a teaser — the reveal is part of the fun.",
      },
    },
    {
      "@type": "Question",
      name: "Can I date people I meet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Friendship first. If both people opt in to dating and both send a Spark, a private chat opens. One-sided Sparks are never revealed.",
      },
    },
  ],
};

const JOURNEY = [
  {
    phase: "Before",
    chip: "bg-chip-yellow",
    steps: [
      { title: "The quiz", body: "Fifteen questions, five minutes, zero wrong answers. Big tappable cards, sliders with personality, one question per screen. At the end: your archetype card — Warm Firecracker, Cozy Philosopher, one of eight — made for sharing." },
      { title: "Pick your night", body: "Dinner for Six, Chai & Chill, a game night or a Sunday run. Filter by budget band (₹ to ₹₹₹) and date. Seats are limited on purpose — tables of six, never a crowd." },
      { title: "Book in one tap", body: "Pay the booking fee and your seat is locked. While booking, you'll leave two truths and a lie — the table finds your lie at dinner." },
    ],
  },
  {
    phase: "The reveal",
    chip: "bg-chip-blue",
    steps: [
      { title: "T-36h: matching runs", body: "The engine seats you with five people who balance you — shared interests for common ground, mixed energy so the table has both talkers and listeners, a shared language guaranteed." },
      { title: "T-24h: venue unlocks", body: "The locked card flips: venue photo, address, directions, and your table teaser — first names and one suspiciously interesting fact each, filling in live as people check in." },
    ],
  },
  {
    phase: "The night",
    chip: "bg-chip-green",
    steps: [
      { title: "Check in with a QR", body: "Scan in at the venue and your seat lights up on the table teaser. Your host has the table warmed up." },
      { title: "Games on the table", body: "A synced deck on everyone's phones: ice-breakers with three depth levels (the table votes to go deeper), hot takes with live vote splits, desi trivia, and everyone's two truths and a lie." },
    ],
  },
  {
    phase: "After",
    chip: "bg-chip-coral",
    steps: [
      { title: "Rate the night", body: "Private, two taps, makes your next table better." },
      { title: "Keep the good ones", body: "Connect with tablemates — mutual connects open a chat, and the table gets a 7-day group chat. Opted into dating? Send a Spark; they only ever know if it's mutual." },
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <MarketingNav />
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <h1 className="text-[clamp(2.2rem,5vw,3.2rem)] font-bold leading-tight tracking-tight">
          From quiz to<br /><span className="text-accent-ink">&ldquo;same table next month?&rdquo;</span>
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          Every part of Mulaqat is designed to remove the awkward parts of meeting new people
          — and keep the good parts. Here&apos;s the whole journey.
        </p>

        <div className="mt-14 flex flex-col gap-12">
          {JOURNEY.map((phase) => (
            <section key={phase.phase}>
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-12 rounded-full ${phase.chip}`} aria-hidden />
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  {phase.phase}
                </h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {phase.steps.map((step) => (
                  <Card key={step.title} large className="h-full p-6">
                    <h3 className="text-[17px] font-bold leading-snug">{step.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{step.body}</p>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 rounded-card-lg bg-ink p-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-paper">
            Sounds like your kind of evening?
          </h2>
          <div className="mt-6">
            <ButtonLink href="/explore" size="lg">
              Find your table
            </ButtonLink>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
