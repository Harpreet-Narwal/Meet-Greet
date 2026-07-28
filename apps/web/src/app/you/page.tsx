import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, Button, Card, LogoMark } from "@mulaqat/ui";

import { AppShell } from "@/components/app-shell";
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

interface BookingView {
  id: string;
  status: string;
  amount_inr: number;
  event: { id: string; slug: string; title: string; starts_at: string; type: string };
}
interface ChatView {
  id: string;
  kind: "direct" | "table_group";
  title: string | null;
  last_message: string | null;
  expires_at: string | null;
}

export default async function YouPage() {
  const [me, bookings, chats] = await Promise.all([
    apiFetch<Me>("/me"),
    apiFetch<{ upcoming: BookingView[]; past: BookingView[] }>("/me/bookings"),
    apiFetch<ChatView[]>("/chats"),
  ]);
  const { status, data } = me;
  if (status === 401 || !data) redirect("/login");
  const upcoming = bookings.data?.upcoming ?? [];
  const past = bookings.data?.past ?? [];
  const myChats = chats.data ?? [];

  const { user, personality, counters } = data;
  const displayName = user.first_name ?? "Neighbour";

  return (
    <AppShell active="you">
      <main className="w-full max-w-3xl px-[var(--gutter)] py-12">
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
            <h1 className="text-h1" data-testid="profile-name">
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
              <p className="text-[13px] font-medium uppercase tracking-wide text-ink-soft">
                Table personality
              </p>
              <p className="text-xl font-medium">{personality.archetype}</p>
              {personality.humor_styles.length > 0 ? (
                <p className="mt-1 text-[14px] text-ink-soft">
                  Laughs at: {personality.humor_styles.join(", ")}
                </p>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card large className="mt-10 p-7">
            <p className="font-medium">No personality card yet.</p>
            <p className="mt-1 text-[15px] text-ink-soft">
              Five minutes, fifteen questions —{" "}
              <Link href="/onboarding/quiz" className="font-medium text-accent-ink underline-offset-4 hover:underline">
                take the quiz
              </Link>{" "}
              and we'll find your people.
            </p>
          </Card>
        )}

        {user.interests.length > 0 ? (
          <section className="mt-10">
            <h2 className="label">
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

        {/* ── Seats you've paid for ─────────────────────────────── */}
        <section id="tables" className="mt-14 scroll-mt-24">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-h2">Your seats</h2>
            <span className="label">{upcoming.length} upcoming</span>
          </div>

          {upcoming.length > 0 ? (
            <div className="mt-6">
              {upcoming.map((b) => {
                const paid = b.status === "confirmed" || b.status === "checked_in";
                return (
                  <Link
                    key={b.id}
                    href={`/tables/${b.event.id}`}
                    className="index-row grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="label col-start-1 row-start-1">
                      {new Date(b.event.starts_at).toLocaleString("en-IN", {
                        weekday: "short", day: "numeric", month: "short",
                        hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
                      })} IST
                    </span>
                    <span className="index-name col-start-1 row-start-2 text-h3">{b.event.title}</span>
                    <span className="label col-start-2 row-start-1 !text-ink">
                      {b.amount_inr === 0 ? "Free" : `₹${b.amount_inr}`}
                    </span>
                    <span className={`label col-start-2 row-start-2 ${paid ? "!text-sage" : "!text-accent-ink"}`}>
                      {paid ? "Paid" : b.status === "pending_payment" ? "Payment due" : b.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="measure mt-4 text-ink-soft">
              No seats booked yet.{" "}
              <Link href="/explore" className="text-accent-ink underline-offset-4 hover:underline">
                Find a table
              </Link>{" "}
              — Wednesday and Saturday fill up first.
            </p>
          )}

          {past.length > 0 ? (
            <p className="label mt-6">{past.length} past {past.length === 1 ? "table" : "tables"}</p>
          ) : null}
        </section>

        {/* ── Chats ─────────────────────────────────────────────── */}
        <section id="chats" className="mt-14 scroll-mt-24">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-h2">Your chats</h2>
            <span className="label">{myChats.length} open</span>
          </div>

          {myChats.length > 0 ? (
            <div className="mt-6">
              {myChats.map((c) => (
                <Link
                  key={c.id}
                  href={`/people/chats/${c.id}`}
                  className="index-row grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="index-name col-start-1 row-start-1 text-h3">
                    {c.title ?? (c.kind === "table_group" ? "Your table" : "Chat")}
                  </span>
                  <span className="label col-start-2 row-start-1">
                    {c.kind === "table_group" ? "Table" : "Direct"}
                  </span>
                  {c.last_message ? (
                    <span className="col-start-1 row-start-2 truncate text-ink-soft">{c.last_message}</span>
                  ) : (
                    <span className="label col-start-1 row-start-2">No messages yet</span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="measure mt-4 text-ink-soft">
              No chats yet. They open when you and someone from your table both connect.
            </p>
          )}
        </section>

        <form action="/api/auth/logout" method="post" className="mt-16 border-t border-line pt-6">
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </main>
    </AppShell>
  );
}
