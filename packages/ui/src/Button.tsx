import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "paper";
type Size = "sm" | "md" | "lg";

/*
 * Hinge-style: solid plum pill, white label, no outline. The plum carries white
 * text at 10.2:1, so unlike the previous orange it needs no ink-on-fill trick.
 */
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent font-semibold shadow-soft hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  // Kept as an alias so callers that asked for the accent fill still get it.
  accent:
    "bg-accent text-on-accent font-semibold shadow-soft hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  secondary:
    "bg-surface text-ink border border-line hover:border-accent hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  ghost: "bg-transparent text-ink hover:bg-ink/5 active:scale-[0.98]",
  danger: "bg-danger text-white hover:brightness-110 active:scale-[0.98]",
  // For placement on accent-filled bands (the CTA block)
  paper:
    "bg-paper text-ink font-semibold shadow-soft hover:brightness-[1.03] hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-[17px]",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
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
