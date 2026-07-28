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
  /**
   * Previously selected the larger corner radius. Under the Quiet Editorial
   * scheme every block is square, so this no longer changes anything visually.
   * Kept so the 20-odd existing callers keep compiling; safe to drop when they
   * are next touched.
   */
  large?: boolean;
  /** Background fill. Tinted tones carry `text-ink` and stay AA at body sizes. */
  tone?: Tone;
}

export function Card({ large: _large = false, tone = "surface", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        // Quiet Editorial: a square block sitting ON the paper — a hairline and
        // a flat fill, no radius and no lift. Separation comes from space first,
        // the rule second.
        //
        // Padding is deliberately NOT set here: `cn` is plain clsx with no
        // tailwind-merge, so a default `p-*` would collide with the padding
        // callers already pass (and Tailwind's source order, not ours, would
        // pick the winner). One caller also wants zero padding for a full-bleed
        // image.
        "border border-line text-ink",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
