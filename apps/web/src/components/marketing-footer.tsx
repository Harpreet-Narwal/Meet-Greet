import Link from "next/link";

import { LogoMark } from "@mulaqat/ui";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/explore", label: "Explore events" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/safety", label: "Safety" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/tonight", label: "Tonight" },
      { href: "/people", label: "Your people" },
      { href: "/you", label: "Profile" },
    ],
  },
  {
    title: "Cities",
    links: [
      { href: "/cities/bangalore", label: "Bengaluru" },
      { href: "/cities/mumbai", label: "Mumbai (up next)" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-band">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="inline-flex items-center gap-2.5">
              <LogoMark size={26} className="text-ink" />
              <span className="text-lg font-bold lowercase tracking-tight">mulaqat</span>
            </span>
            <p className="mt-3 max-w-[24ch] text-[14px] leading-relaxed text-ink-soft">
              Dinner with six strangers, chosen for you. Good tables, better company.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
                {column.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[15px] font-medium text-ink transition-colors hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[13px] text-ink-soft">
          <span>© {new Date().getFullYear()} mulaqat — made with chai in Bengaluru</span>
          <a
            href="mailto:hello@mulaqat.app"
            className="font-medium hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            hello@mulaqat.app
          </a>
        </div>
      </div>
    </footer>
  );
}
