import Link from "next/link";

import { ButtonLink } from "@mulaqat/ui";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { Reveal } from "@/components/reveal";
import { TableScene } from "@/components/table-scene";
import { formatINR } from "@/lib/format";

/*
 * Quiet Editorial homepage — docs/design-system.md.
 *
 * The hero is type and nothing else: the reference's whole argument is that
 * scale and space carry more confidence than any illustration can. The event
 * formats are a typographic INDEX rather than a grid of photo cards — real
 * crawlable text, instant paint, and it stays legible at forty rows.
 */

const FORMATS = [
  {
    type: "dinner",
    name: "Dinner for Six",
    price: formatINR(399),
    when: "Wed & Sat · 8pm",
    note: "The signature",
  },
  {
    type: "chai",
    name: "Chai & Chill",
    price: formatINR(99),
    when: "Weekdays · 6pm",
    note: "One easy hour",
  },
  {
    type: "game_night",
    name: "Game Nights",
    price: formatINR(199),
    when: "Sat · 7pm",
    note: "Boards, cards, loud laughter",
  },
  {
    type: "run_club",
    name: "Run Club Sundays",
    price: "Free",
    when: "Sun · 6am",
    note: "Easy pace, good company",
  },
  {
    type: "trek",
    name: "Treks & Day Trips",
    price: "Soon",
    when: "Weekends",
    note: "Weekend-sized adventures",
  },
];

const STEPS = [
  {
    n: "01",
    title: ["Take the ", "quiz"],
    body: "Fifteen questions, five minutes, more fun than it has any right to be. Energy, humour, languages, how fast you like a conversation to get real. You come out with an archetype card worth putting on your story.",
  },
  {
    n: "02",
    title: ["Get your ", "table"],
    body: "Book a seat and we build the other five around you — shared ground so there's something to say, different enough that it stays interesting. Ages within four years, always a common language. It's deterministic math, not vibes.",
  },
  {
    n: "03",
    title: ["The venue ", "reveals"],
    body: "You get the neighbourhood when you book and the exact address twenty-four hours before, along with first names and a teaser about who's coming. The countdown is half the fun.",
  },
  {
    n: "04",
    title: ["Just ", "show up"],
    body: "A trained host starts the evening and the app runs the ice-breakers, hot takes and desi trivia. The first twenty awkward minutes — deleted. Afterwards you decide who you'd like to see again.",
  },
];

const FAQS = [
  {
    q: "How does the matching actually work?",
    a: "Your quiz builds a personality profile — energy, depth, humour, interests, languages. The matching engine composes tables of six that balance common ground with complementary personalities, keeps age bands within ±4 years, and guarantees everyone shares a language. It's deterministic math, not vibes.",
  },
  {
    q: "What does a dinner cost?",
    a: "The booking fee is ₹399 for the signature dinner (chai hours are ₹99, run clubs are free). Food and drinks you order go straight to the restaurant — we never mark up your meal. Cancel more than 48 hours out and the full amount comes back as credit.",
  },
  {
    q: "Is this a dating app?",
    a: "Friendship first, always. If you opt in to 'open to dating', you can send a Spark to someone you actually met. They'll only ever know if they Spark you back — one-sided Sparks are invisible, forever. No swiping on strangers.",
  },
  {
    q: "How do you keep tables safe?",
    a: "Every member is selfie-verified, every venue is vetted and public, and a trained host anchors every event. Women-only tables run every week, and safety features are never paid features.",
  },
  {
    q: "What happens after the dinner?",
    a: "Rate the night privately, then Connect with anyone from your table — mutual connects open a chat, and your table gets a 7-day group chat to plan round two. The people you meet are yours to keep.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <MarketingNav />

      <main>
        {/* ── Hero: type only ──────────────────────────────────────
             The h1 is the LCP element, so it carries NO entrance animation:
             anything starting at opacity 0 defers LCP until the animation ends,
             which measured 3.5s on CI hardware. The quieter elements around it
             still rise in — the movement reads the same, and LCP lands with
             first paint. */}
        <header className="flex min-h-[86svh] flex-col justify-end px-[var(--gutter)] pb-[var(--section-sm)] pt-24">
          <p className="label rise">Bengaluru — now seating</p>
          <h1 className="display mt-8 text-display-xl">
            <span className="block">Tables that</span>
            <span className="block">turn strangers</span>
            <span className="block">
              into <em>your people</em>
            </span>
          </h1>
          <div className="rise" style={{ animationDelay: "300ms" }}>
            <div className="label mt-10 flex flex-wrap gap-x-10 gap-y-2 border-t border-line pt-5">
              <span className="flex items-center gap-2.5">
                <i className="size-1.5 rounded-full bg-sage" aria-hidden />
                Six seats a table
              </span>
              <span className="flex items-center gap-2.5">
                <i className="size-1.5 rounded-full bg-accent" aria-hidden />
                Wed &amp; Sat, 8pm
              </span>
              <span className="flex items-center gap-2.5">
                <i className="size-1.5 rounded-full bg-accent" aria-hidden />
                Venue revealed T-24h
              </span>
              <span className="flex items-center gap-2.5">
                <i className="size-1.5 rounded-full bg-accent" aria-hidden />
                From {formatINR(99)}
              </span>
            </div>
          </div>
          <div className="rise mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "380ms" }}>
            <ButtonLink href="/explore" size="lg" data-testid="hero-cta">
              Find your table
            </ButtonLink>
            <ButtonLink href="/how-it-works" variant="secondary" size="lg">
              How it works
            </ButtonLink>
          </div>
        </header>

        {/* ── Standfirst ───────────────────────────────────────── */}
        <section
          id="why"
          className="grid scroll-mt-24 grid-cols-12 gap-6 px-[var(--gutter)] py-[var(--section)]"
        >
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <Reveal>
              <span className="label">The premise</span>
            </Reveal>
            <Reveal delay={60}>
              <p className="measure mt-6 text-lead">
                You moved cities for work and ended up with colleagues instead of friends. We fix
                that the oldest way there is — dinner, with five people chosen because you&apos;d
                actually enjoy each other.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <p className="measure mt-6 text-ink-soft">
                A five-minute quiz tells us how you talk, argue and laugh. An algorithm builds a
                table around it. You get the neighbourhood when you book and the address the day
                before. No swiping, no profiles to scroll, no hundred-person mixer where you leave
                with three business cards. Just a table, a time, and five strangers who won&apos;t be
                strangers by dessert.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Marquee ──────────────────────────────────────────── */}
        <div className="marquee" aria-hidden>
          <div className="marquee-track">
            {[0, 1].map((copy) =>
              FORMATS.map((format) => <span key={`${copy}-${format.type}`}>{format.name}</span>),
            )}
          </div>
        </div>

        {/* ── How an evening works ─────────────────────────────── */}
        <section className="defer-render px-[var(--gutter)] py-[var(--section)]">
          <Reveal>
            <span className="label">How an evening works</span>
          </Reveal>
          <div className="mt-12">
            {STEPS.map((step, index) => (
              <div
                key={step.n}
                className="grid grid-cols-12 gap-x-6 gap-y-3 border-t border-line py-8 last:border-b md:py-10"
              >
                <Reveal className="col-span-12 md:col-span-1">
                  <span className="label !text-accent-ink">{step.n}</span>
                </Reveal>
                <Reveal delay={50} className="col-span-12 md:col-span-5">
                  <h2 className="display text-h2">
                    {step.title[0]}
                    <em>{step.title[1]}</em>
                  </h2>
                </Reveal>
                <Reveal delay={100} className="col-span-12 md:col-span-5 md:col-start-8">
                  <p className="text-ink-soft">{step.body}</p>
                </Reveal>
                <span className="sr-only">{`Step ${index + 1} of ${STEPS.length}`}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── The table itself ─────────────────────────────────── */}
        <section className="defer-render px-[var(--gutter)] pb-[var(--section)]">
          <Reveal>
            <div className="mx-auto max-w-md">
              <TableScene />
              <p className="measure mx-auto mt-8 text-center text-ink-soft">
                Tonight&apos;s table: two engineers, a doctor, a founder —{" "}
                <span className="text-ink">four of you love standup.</span>
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── Formats index ────────────────────────────────────── */}
        <section className="defer-render px-[var(--gutter)] py-[var(--section)]">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <Reveal>
              <h2 className="display text-h2">
                More than <em>dinner</em>
              </h2>
            </Reveal>
            <Reveal delay={60}>
              <span className="label">Five formats — Bengaluru</span>
            </Reveal>
          </div>

          <div className="mt-12">
            {FORMATS.map((format, index) => (
              <Link
                key={format.type}
                href={format.type === "trek" ? "/explore" : `/explore?type=${format.type}`}
                className="index-row grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-6 gap-y-1 py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:grid-cols-[3rem_9rem_1fr_auto_6rem] md:py-7"
              >
                <span className="label col-start-1">{String(index + 1).padStart(2, "0")}</span>
                <span className="label col-start-2 md:col-start-2">{format.when}</span>
                <span className="index-name display col-span-2 col-start-2 text-h3 md:col-span-1 md:col-start-3">
                  {format.name}
                </span>
                <span className="label col-start-2 md:col-start-4 md:text-right">
                  {format.note}
                </span>
                <span className="label col-start-3 row-start-1 !text-ink md:col-start-5 md:row-start-auto md:text-right">
                  {format.price}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Statement ────────────────────────────────────────── */}
        <section className="px-[var(--gutter)] py-[var(--section)]">
          {/* One Reveal around the whole heading: a <div> cannot legally live
              inside an <h2>, and the parser's fix-up breaks hydration. */}
          <Reveal>
            <h2 className="display text-display">
              <span className="block">Nobody makes friends</span>
              <span className="block">
                by <em>swiping.</em>
              </span>
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="measure mt-10 text-ink-soft">
              So there&apos;s no swiping here. You can only connect with someone whose company
              you&apos;ve already sat through — which turns out to be the only filter that has ever
              worked. If something more happens, it happens quietly, and only if you both say so.
            </p>
          </Reveal>
        </section>

        {/* ── Spark note ───────────────────────────────────────── */}
        <div className="px-[var(--gutter)]">
          <Reveal>
            {/* The one place --accent-2 (haldi) is allowed to appear. */}
            <div
              className="grid grid-cols-12 items-center gap-6 border border-line p-8 md:p-12"
              style={{
                background:
                  "radial-gradient(120% 140% at 12% 50%, color-mix(in srgb, var(--accent-2) 16%, transparent), transparent 62%)",
              }}
            >
              <span className="label col-span-12 md:col-span-3">On Sparks</span>
              <p className="col-span-12 text-lead md:col-span-9">
                A Spark is only ever visible when it&apos;s mutual. If they didn&apos;t send one,
                they will never know you did —{" "}
                <em className="font-display lowercase italic">not in the app, not anywhere.</em>
              </p>
            </div>
          </Reveal>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section className="defer-render px-[var(--gutter)] py-[var(--section)]">
          <Reveal>
            <h2 className="display text-h2">
              Fair <em>questions</em>
            </h2>
          </Reveal>
          <div className="mt-12">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group border-t border-line last:border-b">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-h3 font-display [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span
                    className="shrink-0 text-ink-muted transition-transform duration-300 group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="measure pb-8 text-ink-soft">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="px-[var(--gutter)] py-[var(--section)]">
          <Reveal>
            <h2 className="display text-display">
              <span className="block">Wednesday&apos;s list</span>
              <span className="block">
                opens <em>Monday noon.</em>
              </span>
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-12">
              <ButtonLink href="/explore" size="lg">
                Find your table
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={220}>
            <p className="label mt-8">
              Selfie-verified members · Vetted venues · A host at every table
            </p>
          </Reveal>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
