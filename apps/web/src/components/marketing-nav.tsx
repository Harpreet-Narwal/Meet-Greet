import Link from "next/link";

import { ButtonLink, Logo } from "@mulaqat/ui";

import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/#why", label: "Why Mulaqat" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/explore", label: "Events" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  return (
    <header className="nav-blur sticky top-0 z-50 border-b border-chip-beige">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" aria-label="Mulaqat home" className="shrink-0">
          <Logo size={28} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <ButtonLink href="/login" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/explore" size="sm" data-testid="nav-cta">
            Find your table
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
