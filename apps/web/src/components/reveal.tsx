"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@mulaqat/ui";

interface RevealProps {
  children: ReactNode;
  /** Stagger offset in ms. */
  delay?: number;
  className?: string;
}

/**
 * Mask-up on first scroll into view. Progressive enhancement: the hidden state
 * only applies under `html.js` (set in layout), so the page is fully readable
 * without JavaScript; reduced-motion users skip it entirely.
 *
 * The animated properties live on an INNER element on purpose. Chromium clips
 * an element's IntersectionObserver rect by its own `clip-path`, so putting the
 * mask on the observed node makes its intersection permanently empty — the
 * callback fires once at ratio 0 and never again, and nothing ever reveals.
 * The observed wrapper therefore stays unclipped.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("revealed");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Reveal when scrolled into view — or immediately if the element is
          // already ABOVE the viewport. Without the second case, landing
          // mid-page (an anchor link, or a restored scroll position) leaves
          // everything overhead permanently invisible once the reader scrolls up.
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            el.classList.add("revealed");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("reveal", className)}>
      <div
        className="reveal-inner"
        style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
