import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/** Flat pastel fills — sinqlo-style cards are colour blocks, not floating panels. */
type Tone = "surface" | "yellow" | "green" | "blue" | "coral" | "beige";

const toneClasses: Record<Tone, string> = {
  surface: "bg-surface",
  yellow: "bg-chip-yellow",
  green: "bg-chip-green",
  blue: "bg-chip-blue",
  coral: "bg-chip-coral",
  beige: "bg-chip-beige",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Larger radius for hero/feature cards. */
  large?: boolean;
  /** Background fill. Pastel tones carry `text-ink` and stay AA at body sizes. */
  tone?: Tone;
}

export function Card({ large = false, tone = "surface", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        // Beige hairline instead of grey + shadow: the scheme is flat, so depth
        // comes from the colour block itself, not from a drop shadow.
        "border border-chip-beige text-ink",
        toneClasses[tone],
        large ? "rounded-card-lg" : "rounded-card",
        className,
      )}
      {...props}
    />
  );
}
