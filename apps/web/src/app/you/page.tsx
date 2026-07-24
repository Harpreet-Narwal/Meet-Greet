import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, Button, Card, Logo, LogoMark } from "@mulaqat/ui";

import { apiFetch } from "@/lib/api";

export const metadata: Metadata = {
  title: "You",
  robots: { index: false },
};

interface Me {
  user: {
    first_name: string | null;
    full_name: string | null;
    phone: string;
    photo_url: string | null;
    selfie_verified: boolean;
    dietary: string | null;
    languages: string[];
    interests: string[];
  };
  personality: {
    archetype: string;
    archetype_emoji: string;
    humor_styles: string[];
  } | null;
  counters: { events_attended: number; people_met: number };
}

const DIETARY_LABELS: Record<string, string> = {
  veg: "Veg 🌱",
  nonveg: "Non-veg",
  jain: "Jain",
  vegan: "Vegan",
  eggetarian: "Eggetarian",
};

export default async function YouPage() {
  const { status, data } = await apiFetch<Me>("/me");
  if (status === 401 || !data) redirect("/login");

  const { user, personality, counters } = data;
  const displayName = user.first_name ?? "Neighbour";

  return (
    <div className="min-h-dvh">
      <header className="nav-blur sticky top-0 z-50 border-b border-chip-beige">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3.5">
          <Link href="/" aria-label="Mulaqat home">
            <Logo size={26} />
          </Link>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="flex items-center gap-5">
          {user.photo_url ? (
            /* plain <img>: MinIO dev URL; next/image remotePatterns config lands with the real CDN */
            <img
              src={user.photo_url}
              alt={`${displayName}'s photo`}
              className="size-20 rounded-full border border-line object-cover shadow-soft"
            />
          ) : (
            <div className="grid size-20 place-items-center rounded-full bg-accent/10">
              <LogoMark size={36} className="text-ink" />
            </div>
          )}
          <div>
            <h1 className="text-[28px] font-bold tracking-tight" data-testid="profile-name">
              {displayName}
            </h1>
            <p className="mt-0.5 text-[14px] text-ink-soft">
              {counters.events_attended === 0
                ? "Your first table is waiting."
                : `${counters.events_attended} events · ${counters.people_met} people met`}
            </p>
          </div>
          {user.selfie_verified ? <Badge tone="sage">Verified</Badge> : null}
        </div>

        {personality ? (
          <Card large className="mt-10 flex items-center gap-5 p-7" data-testid="profile-archetype">
            <span className="text-5xl" aria-hidden>
              {personality.archetype_emoji}
            </span>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
                Table personality
              </p>
              <p className="text-xl font-bold">{personality.archetype}</p>
              {personality.humor_styles.length > 0 ? (
                <p className="mt-1 text-[14px] text-ink-soft">
                  Laughs at: {personality.humor_styles.join(", ")}
                </p>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card large className="mt-10 p-7">
            <p className="font-semibold">No personality card yet.</p>
            <p className="mt-1 text-[15px] text-ink-soft">
              Five minutes, fifteen questions —{" "}
              <Link href="/onboarding/quiz" className="font-semibold text-accent-ink underline-offset-4 hover:underline">
                take the quiz
              </Link>{" "}
              and we'll find your people.
            </p>
          </Card>
        )}

        {user.interests.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
              Can talk for an hour about
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.interests.map((interest) => (
                <Badge key={interest} tone="accent">
                  {interest}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {user.languages.length > 0 || user.dietary ? (
          <section className="mt-8 flex flex-wrap gap-2">
            {user.dietary ? <Badge tone="sage">{DIETARY_LABELS[user.dietary] ?? user.dietary}</Badge> : null}
            {user.languages.map((language) => (
              <Badge key={language} tone="neutral">
                {language}
              </Badge>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
