import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "paper";
type Size = "sm" | "md" | "lg";

/*
 * Quiet Editorial: square, flat, mono label in uppercase with wide tracking.
 *
 * The primary action is an INK fill rather than the accent — black-on-paper is
 * both correct for this aesthetic and the safest contrast we have (15:1). Clay
 * is reserved for the hover state, rules and underlines; as a fill it only
 * clears AA with white on top, which is why `accent` sets text-on-accent.
 */
const variantClasses: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-accent hover:gap-3.5",
  // The clay fill, for the rare moment it should carry the action itself.
  accent: "bg-accent text-on-accent hover:brightness-110 hover:gap-3.5",
  secondary: "bg-transparent text-ink border border-line hover:border-ink hover:gap-3.5",
  ghost: "bg-transparent text-ink-soft hover:text-ink",
  danger: "bg-danger text-white hover:brightness-110",
  // For placement on ink- or accent-filled bands (the CTA block)
  paper: "bg-paper text-ink hover:bg-accent hover:text-on-accent hover:gap-3.5",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2.5",
  md: "px-6 py-3.5",
  lg: "px-8 py-4",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2.5 select-none " +
  "font-mono uppercase tracking-[0.16em] text-label font-medium " +
  "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent " +
  "disabled:opacity-50 disabled:pointer-events-none";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/** Anchor styled as a button — for links that look like actions (SEO-friendly real <a>). */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}
