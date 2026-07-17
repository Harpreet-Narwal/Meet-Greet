import { z } from "zod";

export const EventListQuerySchema = z.object({
  city: z.string().min(2).default("bangalore"),
  type: z.enum(["dinner", "run_club", "game_night", "chai", "trek"]).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  budget: z.enum(["budget", "moderate", "premium"]).optional(),
  include_past: z.coerce.boolean().default(false),
});
export type EventListQuery = z.infer<typeof EventListQuerySchema>;

export const AdminEventSchema = z.object({
  city_slug: z.string().min(2),
  venue_slug: z.string().min(2).optional(),
  type: z.enum(["dinner", "run_club", "game_night", "chai", "trek"]),
  title: z.string().min(4).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "lowercase letters, digits and dashes only")
    .min(4)
    .max(80),
  description: z.string().min(10).max(2000),
  starts_at: z.coerce.date(),
  duration_min: z.number().int().min(30).max(600),
  price_inr: z.number().int().min(0).max(100000),
  capacity: z.number().int().min(6).max(120),
  budget_band: z.enum(["budget", "moderate", "premium"]),
  women_only: z.boolean().default(false),
  neighborhood_teaser: z.string().max(140).optional(),
  tables: z.number().int().min(1).max(20).default(1),
});
export type AdminEventDto = z.infer<typeof AdminEventSchema>;

export const AdminEventPatchSchema = AdminEventSchema.partial().extend({
  status: z
    .enum(["draft", "published", "matching", "revealed", "live", "completed", "cancelled"])
    .optional(),
});
export type AdminEventPatchDto = z.infer<typeof AdminEventPatchSchema>;

/** Venue details are only public once the event has been revealed (plan §5). */
export const VENUE_VISIBLE_STATUSES = ["revealed", "live", "completed"] as const;
