import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "paper";
type Size = "sm" | "md" | "lg";

/*
 * Primary is a pastel-green button with an ink hairline, not an orange fill.
 * Orange is a punctuation colour in this scheme — reserved for the `accent`
 * variant and for focus rings — so the page reads as pastel-and-ink rather
 * than as one saturated hue repeated on every control.
 */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-chip-green text-ink border border-ink font-semibold hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  accent:
    "bg-accent text-on-accent border border-ink font-semibold hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  secondary:
    "bg-surface text-ink border border-ink hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  ghost: "bg-transparent text-ink hover:bg-ink/5 active:scale-[0.98]",
  danger: "bg-danger text-white border border-ink hover:brightness-105 active:scale-[0.98]",
  // For placement on ink- or accent-filled bands (the CTA block)
  paper:
    "bg-paper text-ink border border-ink font-semibold hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-[17px]",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-card font-semibold " +
  "transition-all duration-200 ease-out select-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
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
