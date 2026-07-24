import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/** Optional tinted fills; the default surface card is white with a soft lift. */
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
        // Hairline plus a soft lift — Hinge's cards sit slightly above the page
        // rather than reading as flat colour blocks.
        "border border-line/70 text-ink shadow-soft",
        toneClasses[tone],
        large ? "rounded-card-lg" : "rounded-card",
        className,
      )}
      {...props}
    />
  );
}
