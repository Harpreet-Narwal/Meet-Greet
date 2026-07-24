import type { Metadata } from "next";

import { ButtonLink, Card } from "@mulaqat/ui";

import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";

export const metadata: Metadata = {
  title: "Safety",
  description:
    "Selfie-verified members, vetted public venues, a trained host at every table, women-only tables, SOS and a one-strike policy. Safety is never a paid feature at Mulaqat.",
  alternates: { canonical: "/safety" },
};

const PILLARS = [
  {
    chip: "bg-chip-green",
    title: "Everyone is verified",
    body: "A mandatory selfie check before your first table, with optional government-ID verification for a badge. No last names, workplaces or socials are shared until a connection is mutual.",
  },
  {
    chip: "bg-chip-blue",
    title: "Vetted venues, always public",
    body: "Every event happens at a partner venue we've visited — well-lit, public, easy to reach. The address is shared with attendees only, 24 hours before.",
  },
  {
    chip: "bg-chip-yellow",
    title: "A host at every table",
    body: "Trained community hosts anchor every event: greeting you at the door, keeping the table warm, and handling anything that comes up. Women get their host's contact before their first event.",
  },
  {
    chip: "bg-chip-coral",
    title: "Women-only tables",
    body: "Every week, hosted by women. Same matching, same games, a room of your own.",
  },
];

const TOOLS = [
  { title: "SOS button", body: "In the app during every event — alerts our team with your live location." },
  { title: "Report & block", body: "Two taps from any profile or chat. Blocked pairs are never seated together again." },
  { title: "One-strike policy", body: "Harassment means removal. No second chances, no exceptions." },
  { title: "Live location share", body: "Optionally share your evening's location with a trusted contact." },
];

export default function SafetyPage() {
  return (
    <div className="min-h-dvh">
      <MarketingNav />
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <h1 className="text-[clamp(2.2rem,5vw,3.2rem)] font-bold leading-tight tracking-tight">
          Excitement is the point.<br /><span className="text-accent-ink">Risk isn&apos;t.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          Meeting strangers only works when everyone feels safe doing it. This is the
          foundation Mulaqat is built on — and none of it is ever behind a paywall.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <Card key={pillar.title} large className="p-7">
              <span className={`inline-block size-8 rounded-full ${pillar.chip}`} aria-hidden />
              <h2 className="mt-4 text-xl font-bold">{pillar.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{pillar.body}</p>
            </Card>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
            In your pocket, every event
          </h2>
          <div className="mt-4 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <div key={tool.title} className="flex gap-3.5">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-sage" aria-hidden />
                <div>
                  <h3 className="font-bold">{tool.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{tool.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-16 rounded-card-lg border border-line bg-surface p-8 shadow-soft">
          <h2 className="text-lg font-bold">Something didn&apos;t feel right?</h2>
          <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Tell us — every report is read by a human and acted on. Write to{" "}
            <a href="mailto:safety@mulaqat.app" className="font-semibold text-accent-ink underline-offset-4 hover:underline">
              safety@mulaqat.app
            </a>{" "}
            or use the report button anywhere in the app.
          </p>
        </div>

        <div className="mt-10 text-center">
          <ButtonLink href="/explore" size="lg">
            Find your table
          </ButtonLink>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
