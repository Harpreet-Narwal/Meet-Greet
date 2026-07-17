/**
 * Shared types across web + api. The generated OpenAPI client lands in ./api.gen.d.ts
 * via `pnpm gen:client` (requires the api running at :4000).
 */

/**
 * Working title (IMPLEMENTATION_PLAN.md §13): every user-facing use of the brand name
 * flows through this constant so a rename is one commit.
 */
export const BRAND_NAME = "mulaqat";
export const BRAND_NAME_DISPLAY = "Mulaqat";

export type EventType = "dinner" | "run_club" | "game_night" | "chai" | "trek";

export type Archetype =
  | "Warm Firecracker"
  | "Social Alchemist"
  | "Playful Spark"
  | "Cozy Philosopher"
  | "Curious Wanderer"
  | "Steady Anchor"
  | "Gentle Rebel"
  | "Quiet Observer";

export interface HealthResponse {
  status: "ok";
  service: "web" | "api" | "ai";
  version?: string;
}
