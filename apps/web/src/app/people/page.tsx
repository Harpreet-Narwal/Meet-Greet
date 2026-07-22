import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, ButtonLink, Card } from "@mulaqat/ui";

import { AppNav } from "@/components/app-nav";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = {
  title: "Your people",
  robots: { index: false },
};

interface Connection {
  id: string;
  kind: "connect" | "spark";
  status: "pending" | "mutual";
  direction: "outgoing" | "mutual";
  person: { id: string; first_name: string | null; photo_url: string | null };
}
interface Chat {
  id: string;
  kind: "direct" | "table_group";
  title: string;
  last_message: string | null;
  is_spark: boolean;
  expires_at: string | null;
}

export default async function PeoplePage() {
  const [conns, chats] = await Promise.all([
    apiFetch<Connection[]>("/me/connections"),
    apiFetch<Chat[]>("/chats"),
  ]);
  if (conns.status === 401) redirect("/login?next=/people");

  const mutuals = (conns.data ?? []).filter((c) => c.status === "mutual");
  const pending = (conns.data ?? []).filter((c) => c.status === "pending");

  return (
    <div className="min-h-dvh">
      <AppNav active="people" />

      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-bold tracking-tight">Your people.</h1>

        {/* Chats */}
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Chats</h2>
          {chats.data && chats.data.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              {chats.data.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/people/chats/${chat.id}`}
                  className="rounded-card-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Card className="flex items-center gap-4 p-4 transition-colors hover:border-accent/40">
                    <span className="grid size-11 place-items-center rounded-full bg-accent/10 text-lg" aria-hidden>
                      {chat.is_spark ? "✨" : "🍽️"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{chat.title}</p>
                      <p className="truncate text-[13px] text-ink-soft">
                        {chat.last_message ?? "Say the first hello"}
                      </p>
                    </div>
                    {chat.is_spark ? <Badge tone="spark">Spark</Badge> : null}
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-ink-soft">
              No chats yet. Connect with your table after a night out and they&apos;ll show up here.
            </p>
          )}
        </section>

        {/* Mutual connections */}
        {mutuals.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">Connected</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {mutuals.map((c) => (
                <Badge key={c.id} tone={c.kind === "spark" ? "spark" : "sage"}>
                  {c.person.first_name} {c.kind === "spark" ? "✨" : ""}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {/* My pending outgoing — never reveals who reached toward me */}
        {pending.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
              You reached out
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {pending.map((c) => (
                <Badge key={c.id} tone="neutral">
                  {c.person.first_name} · {c.kind === "spark" ? "spark sent" : "connect sent"}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-ink-soft">
              We&apos;ll tell you the moment it&apos;s mutual — and only then.
            </p>
          </section>
        ) : null}

        {mutuals.length === 0 && pending.length === 0 && (!chats.data || chats.data.length === 0) ? (
          <Card large className="mt-8 p-7">
            <p className="font-semibold">Your table is one dinner away.</p>
            <p className="mt-1 text-[15px] text-ink-soft">
              The people you meet at events show up here — to stay friends, or maybe more.
            </p>
            <ButtonLink href="/explore" size="md" className="mt-5">Find a table</ButtonLink>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
