import Link from "next/link";

/**
 * A way out of a focused flow (booking, checkout, the table, the game room).
 *
 * Deliberately a real `<a>` to a known destination rather than `history.back()`:
 * a link works before React has hydrated and survives a page that was opened
 * directly (from a notification, a shared URL, or a refresh), where `back()`
 * would either do nothing or throw the reader out of the app entirely.
 */
export function BackLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`label inline-flex items-center gap-2 py-1 transition-colors hover:!text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${className}`}
    >
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
}
