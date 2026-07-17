import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Larger radius for hero/feature cards. */
  large?: boolean;
}

export function Card({ large = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-line shadow-soft",
        large ? "rounded-card-lg" : "rounded-card",
        className,
      )}
      {...props}
    />
  );
}
