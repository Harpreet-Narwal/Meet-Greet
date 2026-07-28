import Link from "next/link";

import { ButtonLink, LogoMark } from "@mulaqat/ui";

import { ThemeToggle } from "@/components/theme-toggle";

export type AppSection = "tonight" | "explore" | "people" | "chats" | "you";

const NAV: { href: string; label: string; section: AppSection; hint: string }[] = [
  { href: "/tonight", label: "Tonight", section: "tonight", hint: "Your next table" },
  { href: "/explore", label: "Tables", section: "explore", hint: "Book a seat" },
  { href: "/you#tables", label: "Your seats", section: "you", hint: "Booked & paid" },
  { href: "/people", label: "Chats", section: "chats", hint: "Messages" },
  { href: "/people#connections", label: "People", section: "people", hint: "Connections" },
];

/**
 * The authed shell: a persistent rail on desktop, a top bar on mobile.
 *
 * Every item is a real `<a>` — never a button that navigates in an onClick.
 * Those need React to have hydrated before the first click does anything, which
 * is exactly the "I have to click it twice" behaviour.
 */
export function AppShell({
  active,
  children,
}: {
  active: AppSection;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      {/* Mobile top bar */}
      <header className="nav-blur sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-line px-[var(--gutter)] py-4 md:hidden">
        <Link
          href="/"
          aria-label="Mulaqat home"
          className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <LogoMark size={20} className="text-ink" />
          <span className="label !text-ink">Mulaqat</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ButtonLink href="/explore" size="sm">
            Find a table
          </ButtonLink>
        </div>
      </header>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-6 py-6 md:flex">
        <Link
          href="/"
          aria-label="Mulaqat home"
          className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <LogoMark size={20} className="text-ink" />
          <span className="label !text-ink">Mulaqat</span>
        </Link>

        <nav aria-label="App" className="mt-10 flex flex-col">
          {NAV.map((item) => {
            const isActive = item.section === active;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`group border-t border-line py-3.5 transition-colors last:border-b focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isActive ? "text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                <span className="block text-h4">{item.label}</span>
                <span className="label mt-0.5 block">{item.hint}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5">
          <Link
            href="/you"
            className={`label transition-colors hover:!text-ink ${active === "you" ? "!text-ink" : ""}`}
          >
            Profile
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
