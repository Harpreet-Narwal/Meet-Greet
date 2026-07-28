import Link from "next/link";

import { LogoMark } from "@mulaqat/ui";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Tables",
    links: [
      { href: "/explore", label: "Explore events" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Membership" },
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
      { href: "/cities/bangalore", label: "Bengaluru — live" },
      { href: "/cities/mumbai", label: "Mumbai — soon" },
    ],
  },
];

/*
 * Editorial footer: the email is the loudest thing here, set in the display
 * face. Everything else stays quiet mono.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="w-full px-[var(--gutter)] py-[var(--section-sm)]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-start">
            <span className="inline-flex items-center gap-2.5">
              <LogoMark size={20} className="text-ink" />
              <span className="label !text-ink">Mulaqat</span>
            </span>
            <span className="label mt-8">Get in touch</span>
            <a
              href="mailto:hello@mulaqat.app"
              className="mt-1 font-display text-h3 transition-colors hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              hello@mulaqat.app
            </a>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="label">{column.title}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-ink-soft transition-colors hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="label mt-[var(--section-sm)] flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <span>Mulaqat ©{new Date().getFullYear()} — made with chai in Bengaluru</span>
          <span>Privacy · Terms · Safety</span>
        </div>
      </div>
    </footer>
  );
}
