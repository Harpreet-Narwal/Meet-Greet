import type { ReactNode } from "react";

import { cn } from "@mulaqat/ui";

interface RevealProps {
  children: ReactNode;
  /** Stagger offset in ms. */
  delay?: number;
  className?: string;
}

/**
 * Mask-up as the element scrolls into view.
 *
 * Deliberately a SERVER component with no JavaScript at all. It used to be a
 * client component that mounted an IntersectionObserver per instance; the
 * homepage alone renders ~30 of them, and hydrating that many client boundaries
 * cost 960ms of total blocking time on CI hardware and dragged the Lighthouse
 * performance score to 0.69 against a 0.90 gate.
 *
 * The reveal is now pure CSS, driven by a scroll timeline (`animation-timeline:
 * view()`), so it costs nothing on the main thread. Browsers without support —
 * and readers who ask for reduced motion — simply get the content, already
 * visible, which is the correct fallback either way. See globals.css.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <div className={cn("reveal", className)}>
      <div className="reveal-inner" style={delay ? { animationDelay: `${delay}ms` } : undefined}>
        {children}
      </div>
    </div>
  );
}
