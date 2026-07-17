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
 * Fade-and-rise on first scroll into view. Progressive enhancement:
 * the hidden state only applies under `html.js` (set in layout), so the page
 * is fully readable without JavaScript; reduced-motion users skip it entirely.
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
          if (entry.isIntersecting) {
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
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
