import Link from "next/link";

import { ButtonLink, LogoMark } from "@mulaqat/ui";

import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/explore", label: "Tables" },
  { href: "/safety", label: "Safety" },
  { href: "/pricing", label: "Pricing" },
];

/*
 * Quiet Editorial nav: a hairline, mono labels, and a clay underline that wipes
 * in on hover. No pill, no shadow — the nav should read as a masthead.
 */
export function MarketingNav() {
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

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="label relative py-1 transition-colors hover:!text-ink after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 hover:after:scale-x-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <ButtonLink href="/explore" size="sm" data-testid="nav-cta">
            Find your table
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
