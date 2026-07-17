import { Badge, ButtonLink, Card, Logo, LogoMark } from "@mulaqat/ui";

import { Reveal } from "@/components/reveal";
import { TableScene } from "@/components/table-scene";
import { formatINR } from "@/lib/format";

const CTA_HREF = "mailto:hello@mulaqat.app?subject=Save%20me%20a%20seat";

const steps = [
  {
    number: "01",
    title: "Take the quiz",
    body: "Five minutes, more fun than it sounds. Energy, humour, interests, languages — we learn what makes an evening feel easy for you.",
  },
  {
    number: "02",
    title: "Meet your table",
    body: "Six people, balanced on purpose — talkers with listeners, common ground with just enough plot twist. Venue revealed 24 hours before.",
  },
  {
    number: "03",
    title: "Let the games begin",
    body: "Ice-breakers, hot takes, desi trivia — built into the table. The first twenty awkward minutes? We deleted them.",
  },
];

const formats = [
  {
    name: "Dinner for Six",
    body: "The signature. Wednesdays & Saturdays, 8 PM, at partner restaurants worth dressing up for.",
    price: formatINR(399),
    signature: true,
  },
  {
    name: "Chai & Chill",
    body: "One easy hour on a weekday evening. Zero commitment, full charm.",
    price: formatINR(99),
    signature: false,
  },
  {
    name: "Game Nights",
    body: "Board games and loud laughter at the city's best cafés.",
    price: formatINR(199),
    signature: false,
  },
  {
    name: "Run Club Sundays",
    body: "Easy pace, good company. The cheapest therapy in town.",
    price: "Free",
    signature: false,
  },
];

const trust = [
  { title: "Selfie-verified members", body: "Everyone at the table is who they say they are." },
  { title: "A host at every table", body: "Trained hosts anchor the night at vetted public venues." },
  { title: "Women-only tables", body: "Every week, with a female host you can talk to beforehand." },
  { title: "SOS & one-strike policy", body: "Report, block, live-location share. Zero tolerance." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="nav-blur sticky top-0 z-50 border-b border-line/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo size={28} />
          <ButtonLink href={CTA_HREF} variant="secondary" size="sm">
            Get early access
          </ButtonLink>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-24 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-xl">
            <Badge tone="spark" className="mb-7">
              Now seating in Bengaluru
            </Badge>
            <h1 className="text-[clamp(2.6rem,6.5vw,4.25rem)] font-bold leading-[1.04] tracking-[-0.03em]">
              Dinner with six strangers, <span className="text-accent">chosen for you.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              A five-minute personality quiz. A table of six people you&apos;ll actually click
              with. Games on the table so the conversation never dies.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href={CTA_HREF} size="lg">
                Save me a seat
              </ButtonLink>
              <ButtonLink href="#how-it-works" variant="ghost" size="lg">
                How it works
              </ButtonLink>
            </div>
            <p className="mt-8 text-[13px] font-medium uppercase tracking-wide text-ink-soft">
              Friendship first · Dating only if it clicks · Never a swipe
            </p>
          </div>

          <div>
            <TableScene />
            <p className="mx-auto mt-8 max-w-xs text-center text-[15px] leading-relaxed text-ink-soft">
              Tonight&apos;s table: two engineers, a doctor, a founder —{" "}
              <span className="font-semibold text-ink">four of you love standup.</span>
            </p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section id="how-it-works" className="border-y border-line bg-surface/60">
          <div className="mx-auto w-full max-w-6xl px-6 py-24">
            <Reveal>
              <h2 className="max-w-2xl text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold leading-tight tracking-tight">
                No swiping. No small talk.
                <br />
                Just a good table.
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-5 sm:grid-cols-3">
              {steps.map((step, index) => (
                <Reveal key={step.number} delay={index * 120}>
                  <Card large className="h-full p-8">
                    <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-accent">
                      {step.number}
                    </span>
                    <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Formats ──────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-6 py-24">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold tracking-tight">
                More than dinner.
              </h2>
              <p className="max-w-xs text-[15px] text-ink-soft">
                Different nights, different speeds — same six-people magic.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {formats.map((format, index) => (
              <Reveal key={format.name} delay={index * 100}>
                <Card
                  large
                  className={`relative flex h-full flex-col p-7 transition-all duration-200 ease-out hover:-translate-y-1 ${
                    format.signature ? "border-accent/40 bg-accent/[0.05]" : ""
                  }`}
                >
                  {format.signature ? (
                    <Badge tone="accent" className="mb-4 self-start">
                      Signature
                    </Badge>
                  ) : null}
                  <h3 className="text-lg font-bold">{format.name}</h3>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-soft">
                    {format.body}
                  </p>
                  <p className="mt-5 text-[15px] font-semibold">
                    {format.price}
                    <span className="font-normal text-ink-soft"> · per seat</span>
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Trust ────────────────────────────────────────────── */}
        <section className="border-y border-line bg-surface/60">
          <div className="mx-auto w-full max-w-6xl px-6 py-24">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <Reveal>
                <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold leading-tight tracking-tight">
                  Built for trust,
                  <br />
                  hosted with care.
                </h2>
                <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                  Meeting strangers should feel exciting, not risky. Safety is the foundation —
                  and it is <span className="font-semibold text-ink">never a paid feature.</span>
                </p>
              </Reveal>
              <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {trust.map((item, index) => (
                  <Reveal key={item.title} delay={index * 100}>
                    <div className="flex gap-3.5">
                      <span
                        className="mt-1.5 size-2.5 shrink-0 rounded-full bg-sage"
                        aria-hidden="true"
                      />
                      <div>
                        <h3 className="font-bold">{item.title}</h3>
                        <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Cities ───────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <Reveal>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.5rem)] font-bold tracking-tight">
              Where we&apos;re setting tables
            </h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Card className="flex items-center gap-3 px-6 py-4">
                <span className="font-semibold">Bengaluru</span>
                <Badge tone="sage">Live</Badge>
              </Card>
              <Card className="flex items-center gap-3 px-6 py-4 opacity-75">
                <span className="font-semibold">Mumbai</span>
                <Badge tone="neutral">Up next</Badge>
              </Card>
            </div>
            <p className="mt-8 text-[15px] text-ink-soft">
              Your city missing? Tell us — the loudest neighbourhood gets the next table.
            </p>
          </Reveal>
        </section>

        {/* ── CTA band ─────────────────────────────────────────── */}
        <section className="bg-accent">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center sm:py-24">
            <Reveal>
              <h2 className="text-[clamp(2rem,4.5vw,3rem)] font-bold tracking-tight text-on-accent">
                Your Wednesday table awaits.
              </h2>
              <p className="mt-4 text-lg text-on-accent/75">
                Chai&apos;s on them if you&apos;re late.
              </p>
              <div className="mt-9">
                <ButtonLink href={CTA_HREF} variant="paper" size="lg">
                  Get early access
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-[13px] text-ink-soft">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark size={20} />
            <span>mulaqat — good tables, better company</span>
          </span>
          <span>Made with chai in Bengaluru</span>
        </div>
      </footer>
    </div>
  );
}
