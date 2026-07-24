import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "accent" | "spark" | "sage" | "neutral";

/*
 * Flat pastel chips with an ink hairline (sinqlo's `.small-detail`), not
 * low-opacity tints of the accent. Ink on every pastel clears AA comfortably.
 */
const toneClasses: Record<Tone, string> = {
  accent: "bg-chip-yellow text-ink",
  spark: "bg-chip-coral text-ink",
  sage: "bg-chip-green text-ink",
  neutral: "bg-band text-ink",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-card border border-chip-beige px-2.5 py-1 text-[13px] font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
