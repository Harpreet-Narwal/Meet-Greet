import Link from "next/link";

import { ButtonLink, LogoMark } from "@mulaqat/ui";

import { ThemeToggle } from "@/components/theme-toggle";

const TABS = [
  { href: "/tonight", label: "Tonight" },
  { href: "/explore", label: "Tables" },
  { href: "/people", label: "People" },
];

/**
 * Shared header for the authed app pages (tonight/explore/people/you).
 *
 * Deliberately the same masthead language as MarketingNav — mono labels, a
 * hairline, a clay underline on hover — so crossing from the public site into
 * the app doesn't feel like changing products. The active tab keeps its
 * underline drawn rather than switching to clay text: clay is only 4.2:1 on
 * paper and would fail AA at this size.
 */
export function AppNav({ active }: { active?: "tonight" | "explore" | "people" | "you" }) {
  return (
    <header className="nav-blur sticky top-0 z-50 border-b border-line">
      <div className="flex w-full items-center justify-between gap-4 px-[var(--gutter)] py-4">
        <Link
          href="/"
          aria-label="Mulaqat home"
          className="flex shrink-0 items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <LogoMark size={20} className="text-ink" />
          <span className="label !text-ink">Mulaqat</span>
        </Link>

        <nav aria-label="App" className="hidden items-center gap-8 sm:flex">
          {TABS.map((tab) => {
            const isActive = active && `/${active}` === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`label relative py-1 transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:bg-accent after:transition-transform after:duration-300 hover:!text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                  isActive
                    ? "!text-ink after:scale-x-100"
                    : "after:scale-x-0 hover:after:scale-x-100"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <ButtonLink href="/you" variant={active === "you" ? "primary" : "secondary"} size="sm">
            You
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
