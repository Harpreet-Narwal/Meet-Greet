import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "accent" | "spark" | "sage" | "neutral";

const toneClasses: Record<Tone, string> = {
  accent: "bg-accent/10 text-accent",
  spark: "bg-accent-2/15 text-[color-mix(in_srgb,var(--accent-2)_60%,var(--ink))]",
  sage: "bg-sage/15 text-sage",
  neutral: "bg-ink/5 text-ink-soft",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-medium uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
