import { cn } from "./cn";

export interface LogoMarkProps {
  /** Rendered size in px (square). */
  size?: number;
  className?: string;
}

/**
 * The Mulaqat mark: six people around a table, viewed from above.
 * The terracotta circle is the table, the saffron dot is you.
 * "People" dots use currentColor so the mark adapts to light/dark ink automatically.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      role="img"
      aria-label="Mulaqat"
      className={cn("shrink-0", className)}
    >
      <circle cx="128" cy="128" r="44" fill="var(--accent)" />
      <circle cx="128" cy="38" r="17" fill="var(--accent-2)" />
      <circle cx="205.94" cy="83" r="17" fill="currentColor" />
      <circle cx="205.94" cy="173" r="17" fill="currentColor" />
      <circle cx="128" cy="218" r="17" fill="currentColor" />
      <circle cx="50.06" cy="173" r="17" fill="currentColor" />
      <circle cx="50.06" cy="83" r="17" fill="currentColor" />
    </svg>
  );
}

export interface LogoProps {
  size?: number;
  className?: string;
}

/** Mark + HTML wordmark (brand.md: prefer HTML wordmark over the SVG <text> version). */
export function Logo({ size = 28, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LogoMark size={size} />
      <span
        className="font-bold lowercase leading-none"
        style={{ fontSize: size * 0.82, letterSpacing: "-0.03em" }}
      >
        mulaqat
      </span>
    </span>
  );
}
