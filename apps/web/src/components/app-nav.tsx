import Link from "next/link";

import { ButtonLink, Logo } from "@mulaqat/ui";

const TABS = [
  { href: "/tonight", label: "Tonight" },
  { href: "/explore", label: "Explore" },
  { href: "/people", label: "People" },
];

/**
 * Shared header for the authed app pages (tonight/explore/people/you). Keeps the
 * redesign consistent across every surface, with a 4-tab feel per plan §8.
 */
export function AppNav({ active }: { active?: "tonight" | "explore" | "people" | "you" }) {
  return (
    <header className="nav-blur sticky top-0 z-50 border-b border-line/60">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" aria-label="Mulaqat home" className="shrink-0">
          <Logo size={26} />
        </Link>
        <nav aria-label="App" className="hidden items-center gap-6 sm:flex">
          {TABS.map((tab) => {
            const isActive = active && `/${active}` === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "text-[15px] font-semibold text-accent"
                    : "text-[15px] font-medium text-ink-soft transition-colors hover:text-ink"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <ButtonLink
          href="/you"
          variant={active === "you" ? "primary" : "secondary"}
          size="sm"
        >
          You
        </ButtonLink>
      </div>
    </header>
  );
}
