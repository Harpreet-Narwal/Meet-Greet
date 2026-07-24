import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "yellow" | "green" | "blue" | "coral";

const toneClasses: Record<Tone, string> = {
  yellow: "bg-chip-yellow",
  green: "bg-chip-green",
  blue: "bg-chip-blue",
  coral: "bg-chip-coral",
};

export interface MarkProps extends HTMLAttributes<HTMLElement> {
  tone?: Tone;
}

/**
 * Marker-pen highlight behind a word inside a headline (sinqlo's `.ellipse-text`).
 * Uses <mark> so the emphasis survives with styles off, and resets the UA's
 * yellow/black default in favour of our tokens.
 */
export function Mark({ tone = "yellow", className, ...props }: MarkProps) {
  return (
    <mark
      className={cn(
        "box-decoration-clone rounded-card px-2 py-0.5 text-ink",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
