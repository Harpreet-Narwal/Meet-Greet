import Link from "next/link";

import { Badge, ButtonLink, Card, Mark } from "@mulaqat/ui";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { Reveal } from "@/components/reveal";
import { TableScene } from "@/components/table-scene";
import { formatINR } from "@/lib/format";

const ARCHETYPE_FACES = ["🔥", "✨", "🍵", "🧭", "🌙"];

const PAINS = [
  {
    chip: "bg-chip-yellow",
    title: "New city, zero crew.",
    body: "You moved for the job. Your colleagues are fine, but Sunday evenings are very quiet. Making friends as an adult shouldn't be this hard.",
  },
  {
    chip: "bg-chip-blue",
    title: "Swiping is a part-time job.",
    body: "Endless profiles, dead chats, plans that never happen. Meeting people through a screen was supposed to be easier than this.",
  },
  {
    chip: "bg-chip-coral",
    title: "Big mixers, tiny conversations.",
    body: "A 100-person networking event and you left with three business cards and no friends. Curated beats crowded, every time.",
  },
];

const FORMATS = [
  { type: "dinner", name: "Dinner for Six", price: formatINR(399), chip: "bg-chip-coral", note: "The signature. Wed & Sat, 8 PM." },
  { type: "chai", name: "Chai & Chill", price: formatINR(99), chip: "bg-chip-yellow", note: "One easy weekday hour." },
  { type: "game_night", name: "Game Nights", price: formatINR(199), chip: "bg-chip-green", note: "Boards, cards, loud laughter." },
  { type: "run_club", name: "Run Club Sundays", price: "Free", chip: "bg-chip-blue", note: "Easy pace, good company." },
  { type: "trek", name: "Treks & Day Trips", price: "Soon", chip: "bg-chip-beige", note: "Weekend-sized adventures." },
];

const STEPS = [
  {
    number: "1",
    chip: "bg-chip-yellow",
    title: "Take the five-minute quiz",
    body: "Energy, humour, interests, languages — a quiz that feels like a game, not a form. You get a personality card worth sharing.",
  },
  {
    number: "2",
    chip: "bg-chip-green",
    title: "Get matched into a table of six",
    body: "Our matching engine seats talkers with listeners and common ground with just enough plot twist. No swiping, ever.",
  },
  {
    number: "3",
    chip: "bg-chip-blue",
    title: "Venue reveals 24 hours before",
    body: "Until then: just the neighbourhood and a teaser. The lock-screen countdown is half the fun.",
  },
  {
    number: "4",
    chip: "bg-chip-coral",
    title: "Show up — games included",
    body: "Ice-breakers, hot takes and desi trivia are built into the table. The first twenty awkward minutes? Deleted.",
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
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-24 pt-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-xl">
            <Badge tone="spark" className="mb-7">
              Now seating in Bengaluru
            </Badge>
            <h1 className="text-[clamp(2.6rem,6.5vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.03em]">
              the table for{" "}
              <span className="text-accent-ink">six strangers</span>
            </h1>
            <p className="mt-4 text-[clamp(1.4rem,3vw,2rem)] font-bold leading-tight tracking-tight">
              more real friends.
              <br />
              <span className="text-ink-soft">less small talk.</span>
            </p>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
              A five-minute personality quiz seats you at a dinner, game night or chai hour
              with five people you&apos;ll actually click with — games on the table included.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/explore" size="lg" data-testid="hero-cta">
                Find your table
              </ButtonLink>
              <ButtonLink href="/pricing" variant="secondary" size="lg">
                Pricing
              </ButtonLink>
            </div>
            {/* social-proof row — the 8 archetypes, honestly ours */}
            <div className="mt-9 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {ARCHETYPE_FACES.map((face) => (
                  <span
                    key={face}
                    className="grid size-10 place-items-center rounded-full border-2 border-paper bg-surface text-lg shadow-soft"
                    aria-hidden
                  >
                    {face}
                  </span>
                ))}
              </div>
              <p className="text-[13px] font-medium leading-snug text-ink-soft">
                8 personality archetypes.
                <br />
                One well-mixed table.
              </p>
            </div>
          </div>

          <div>
            <TableScene />
            <p className="mx-auto mt-8 max-w-xs text-center text-[15px] leading-relaxed text-ink-soft">
              Tonight&apos;s table: two engineers, a doctor, a founder —{" "}
              <span className="font-semibold text-ink">four of you love standup.</span>
            </p>
          </div>
        </section>

        {/* ── Pain points ("Why Mulaqat") ──────────────────────── */}
        <section id="why" className="border-y border-line/60 bg-band scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-6 py-24">
            <Reveal>
              <h2 className="max-w-2xl text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold leading-tight tracking-tight">
                City full of people.
                <br />
                Weirdly hard to meet any.
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-5 sm:grid-cols-3">
              {PAINS.map((pain, index) => (
                <Reveal key={pain.title} delay={index * 120}>
                  <Card large className="h-full p-8">
                    <span className={`inline-block size-8 rounded-full ${pain.chip}`} aria-hidden />
                    <h3 className="mt-4 text-xl font-bold">{pain.title}</h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{pain.body}</p>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Value band ───────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <Reveal>
            <span className="text-5xl" aria-hidden>🪑</span>
            <h2 className="mt-5 text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-tight tracking-tight">
              get a great table while your phone stays{" "}
              <Mark tone="yellow">in your pocket.</Mark>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-ink-soft">
              Mulaqat handles the matching, the venue, the ice-breakers and the follow-up —
              you just show up hungry and curious.
            </p>
            <div className="mt-8">
              <ButtonLink href="/explore" size="lg">
                Find your table
              </ButtonLink>
            </div>
          </Reveal>
        </section>

        {/* ── Formats showcase ─────────────────────────────────── */}
        <section className="border-y border-line/60 bg-band">
          <div className="mx-auto w-full max-w-6xl px-6 py-24">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold tracking-tight">
                  More than dinner.
                </h2>
                {/* ink/75 rather than ink-soft: ink-soft on pastel green is 4.5:1
                    exactly, too close to the AA floor to ship. */}
                <p className="max-w-xs text-[15px] text-ink-soft">
                  Different nights, different speeds — same six-people magic.
                </p>
              </div>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {FORMATS.map((format, index) => (
                <Reveal key={format.name} delay={index * 80}>
                  <Link
                    href={format.type === "trek" ? "/explore" : `/explore?type=${format.type}`}
                    className="block h-full rounded-card-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Card
                      large
                      className="flex h-full flex-col p-6 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-accent/50"
                    >
                      <span className={`inline-block h-2 w-10 rounded-full ${format.chip}`} aria-hidden />
                      <h3 className="mt-4 text-[17px] font-bold leading-snug">{format.name}</h3>
                      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-soft">
                        {format.note}
                      </p>
                      <p className="mt-4 text-[15px] font-bold">{format.price}</p>
                    </Card>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works (4 steps) ───────────────────────────── */}
        <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-24">
          <Reveal>
            <h2 className="text-center text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold tracking-tight">
              How Mulaqat works
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <Reveal key={step.number} delay={index * 100}>
                <Card large className="h-full p-7">
                  <span
                    className={`grid size-10 place-items-center rounded-full text-[17px] font-bold text-ink ${step.chip}`}
                    aria-hidden
                  >
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-lg font-bold leading-snug">{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{step.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <ButtonLink href="/how-it-works" variant="secondary" size="md">
              The full story →
            </ButtonLink>
          </Reveal>
        </section>

        {/* ── Feature blocks: at the table / after the table ───── */}
        <section className="border-y border-line/60 bg-band">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <Reveal>
                <Badge tone="accent" className="mb-4">At the table</Badge>
                <h2 className="text-[clamp(1.7rem,3vw,2.2rem)] font-bold leading-tight tracking-tight">
                  Games that do the talking until you do.
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
                  Every table gets a synced deck on your phones: ice-breakers that go exactly as
                  deep as the table votes, spicy-but-safe hot takes, desi trivia, and everyone&apos;s
                  two truths and a lie — collected at booking, revealed at dinner.
                </p>
              </Reveal>
              <Reveal delay={120}>
                <Card large className="p-7">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
                    Hot take · the table votes
                  </p>
                  <p className="mt-3 text-lg font-bold leading-snug">
                    &ldquo;Chai &gt; coffee. There is no debate.&rdquo;
                  </p>
                  <div className="mt-5 flex flex-col gap-2.5">
                    <div>
                      <div className="flex justify-between text-[13px] font-medium">
                        <span>Agree 🙌</span>
                        <span className="text-ink-soft">4</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-ink/10">
                        <div className="h-full w-2/3 rounded-full bg-accent" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[13px] font-medium">
                        <span>Nope 🙅</span>
                        <span className="text-ink-soft">2</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-ink/10">
                        <div className="h-full w-1/3 rounded-full bg-accent-2" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Reveal>
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-2">
              <Reveal className="lg:order-2">
                <Badge tone="spark" className="mb-4">After the table</Badge>
                <h2 className="text-[clamp(1.7rem,3vw,2.2rem)] font-bold leading-tight tracking-tight">
                  Keep the good ones. Quietly.
                </h2>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
                  Connect with anyone from your table — mutual connects open a chat, and the
                  table gets a 7-day group chat for round two. Feeling something more? Send a
                  Spark. They&apos;ll only ever know if they Spark you back.
                </p>
              </Reveal>
              <Reveal delay={120} className="lg:order-1">
                <Card large className="p-7">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
                    Your table · 7-day group chat
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="max-w-[80%] rounded-2xl border border-line bg-paper px-4 py-2.5 text-[14px]">
                      same table next month? 🙋
                    </div>
                    <div className="ml-auto max-w-[80%] rounded-2xl bg-accent px-4 py-2.5 text-[14px] text-on-accent">
                      only if Rohan retakes the trivia loss
                    </div>
                    <div className="max-w-[80%] rounded-2xl border border-line bg-paper px-4 py-2.5 text-[14px]">
                      booked. rematch is on 🎲
                    </div>
                  </div>
                </Card>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Trust strip ──────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold leading-tight tracking-tight">
                Built for trust,
                <br />
                hosted with care.
              </h2>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                Meeting strangers should feel exciting, not risky. Safety is the foundation —
                and it is <span className="font-semibold text-ink">never a paid feature</span>.{" "}
                <Link href="/safety" className="font-semibold text-accent-ink underline-offset-4 hover:underline">
                  Read how →
                </Link>
              </p>
            </Reveal>
            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {[
                { title: "Selfie-verified members", body: "Everyone at the table is who they say they are." },
                { title: "A host at every table", body: "Trained hosts anchor the night at vetted public venues." },
                { title: "Women-only tables", body: "Every week, with a female host you can talk to beforehand." },
                { title: "SOS & one-strike policy", body: "Report, block, live-location share. Zero tolerance." },
              ].map((item, index) => (
                <Reveal key={item.title} delay={index * 100}>
                  <div className="flex gap-3.5">
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-sage" aria-hidden />
                    <div>
                      <h3 className="font-bold">{item.title}</h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{item.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing teaser ───────────────────────────────────── */}
        <section className="border-y border-line/60 bg-paper">
          <div className="mx-auto w-full max-w-6xl px-6 py-24">
            <Reveal>
              <h2 className="text-center text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold tracking-tight">
                A membership like a social club.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {[
                {
                  tier: "Free",
                  price: "₹0",
                  cadence: "forever",
                  points: ["Book any event at full price", "3 Connects per event", "Your personality card"],
                  tone: "surface" as const,
                  highlight: false,
                },
                {
                  tier: "Plus",
                  price: formatINR(499),
                  cadence: "per month",
                  points: ["Unlimited Connects", "See who Sparked you (mutuals first)", "Priority seats on sold-out tables"],
                  tone: "coral" as const,
                  highlight: true,
                },
                {
                  tier: "Concierge",
                  price: formatINR(1499),
                  cadence: "per month",
                  points: ["Guaranteed weekly seat", "Premium venues", "Table-composition preferences"],
                  tone: "surface" as const,
                  highlight: false,
                },
              ].map((plan, index) => (
                <Reveal key={plan.tier} delay={index * 100}>
                  <Card large tone={plan.tone} className="flex h-full flex-col p-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{plan.tier}</h3>
                      {plan.highlight ? <Badge tone="spark">Popular</Badge> : null}
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight">
                      {plan.price}
                      <span className="text-[14px] font-normal text-ink-soft"> {plan.cadence}</span>
                    </p>
                    <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                      {plan.points.map((point) => (
                        <li key={point} className="flex gap-2.5 text-[14px] leading-snug">
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-10 text-center">
              <ButtonLink href="/pricing" variant="secondary" size="md">
                Full pricing details →
              </ButtonLink>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-6 py-24">
          <Reveal>
            <h2 className="text-center text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold tracking-tight">
              Fair questions.
            </h2>
          </Reveal>
          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-card border border-line/70 bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[16px] font-bold [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span
                    className="text-xl text-ink-soft transition-transform duration-200 group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="px-6 pb-6 text-[15px] leading-relaxed text-ink-soft">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA band ─────────────────────────────────────────── */}
        {/* Deep plum band — the one saturated moment on an otherwise white page.
            `--on-accent` flips with the theme so the label stays legible. */}
        <section className="bg-accent">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center sm:py-24">
            <Reveal>
              <h2 className="text-[clamp(2rem,4.5vw,3rem)] font-bold tracking-tight text-on-accent">
                Your Wednesday table awaits.
              </h2>
              <p className="mt-4 text-lg text-on-accent/80">
                Chai&apos;s on them if you&apos;re late.
              </p>
              <div className="mt-9">
                <ButtonLink href="/explore" variant="paper" size="lg">
                  Find your table
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
