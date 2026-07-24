import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "accent" | "spark" | "sage" | "neutral";

/* Soft tinted chips; ink on every tint clears AA comfortably in both themes. */
const toneClasses: Record<Tone, string> = {
  accent: "bg-chip-coral text-ink", // plum tint — the brand chip
  spark: "bg-chip-yellow text-ink",
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
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
