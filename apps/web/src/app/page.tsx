import { Badge, ButtonLink, Card, Logo, LogoMark } from "@mulaqat/ui";

const steps = [
  {
    emoji: "🃏",
    title: "Take the quiz",
    body: "Five minutes, weirdly fun. We learn how you talk, laugh, and what makes an evening feel right.",
  },
  {
    emoji: "🪑",
    title: "Get your table",
    body: "Six people, one vibe. Our matching engine seats talkers with listeners, depth with warmth.",
  },
  {
    emoji: "🥘",
    title: "Just show up",
    body: "Venue revealed 24 hours before. Ice-breaker games on the table. Zero awkward silences on us.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <Logo size={30} />
        <ButtonLink
          href="mailto:hello@mulaqat.app?subject=Save%20me%20a%20seat"
          variant="secondary"
          size="sm"
        >
          Get early access
        </ButtonLink>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-16 pb-20 text-center max-w-3xl mx-auto">
          <Badge tone="spark" className="mb-6">
            Now seating in Bengaluru
          </Badge>
          <h1 className="text-[34px] sm:text-5xl font-bold tracking-tight leading-tight text-balance">
            Dinner with six strangers,
            <br />
            <span className="text-accent">chosen for you.</span>
          </h1>
          <p className="mt-5 text-[17px] text-ink-soft max-w-xl mx-auto text-pretty">
            A 5-minute personality quiz. A curated table of six. One great Wednesday
            evening. Friendship first — everything else only if it clicks.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <ButtonLink href="mailto:hello@mulaqat.app?subject=Save%20me%20a%20seat" size="lg">
              Save me a seat
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="ghost" size="lg">
              How it works
            </ButtonLink>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-10">
            No swiping. No small talk. Just a good table.
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {steps.map((step) => (
              <Card key={step.title} large className="p-6">
                <div className="text-3xl mb-3" aria-hidden>
                  {step.emoji}
                </div>
                <h3 className="font-bold text-lg mb-1.5">{step.title}</h3>
                <p className="text-[15px] text-ink-soft leading-relaxed">{step.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Cities */}
        <section className="px-6 py-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-8">Where we&apos;re setting tables</h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Card className="px-6 py-4 flex items-center gap-3">
              <span className="font-semibold">Bengaluru</span>
              <Badge tone="sage">Live</Badge>
            </Card>
            <Card className="px-6 py-4 flex items-center gap-3 opacity-80">
              <span className="font-semibold">Mumbai</span>
              <Badge tone="neutral">Up next</Badge>
            </Card>
          </div>
          <p className="mt-6 text-[15px] text-ink-soft">
            Your city missing? Tell us — the loudest neighbourhood gets the next table.
          </p>
        </section>
      </main>

      <footer className="px-6 py-10 border-t border-line">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[13px] text-ink-soft">
          <span className="inline-flex items-center gap-2">
            <LogoMark size={20} />
            <span>mulaqat — good tables, better company</span>
          </span>
          <span>Made with chai in Bengaluru ☕</span>
        </div>
      </footer>
    </div>
  );
}
