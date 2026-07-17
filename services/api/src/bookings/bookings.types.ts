import { z } from "zod";

export const TwoTruthsSchema = z.object({
  truths: z.tuple([z.string().min(3).max(140), z.string().min(3).max(140)]),
  lie: z.string().min(3).max(140),
});
export type TwoTruthsDto = z.infer<typeof TwoTruthsSchema>;

/** Cancellation with >48h notice earns a full credit (plan §6). */
export const FULL_CREDIT_WINDOW_HOURS = 48;
/** Unpaid bookings release their seat after this long (plan §6). */
export const PENDING_EXPIRY_MINUTES = 15;
