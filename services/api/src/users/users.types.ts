import { z } from "zod";

export const UpdateMeSchema = z
  .object({
    full_name: z.string().min(2).max(80),
    first_name: z.string().min(1).max(40),
    dob: z.coerce.date().refine(
      (d) => {
        const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
        return age >= 18 && age <= 100;
      },
      { message: "you must be 18+ to join a table" },
    ),
    gender: z.enum(["woman", "man", "nonbinary", "prefer_not"]),
    city_slug: z.string().min(2),
    bio: z.string().max(280),
    photo_url: z.string().url(),
    relationship_intent: z.enum(["friends_only", "open_to_dating"]),
    dietary: z.enum(["veg", "nonveg", "jain", "vegan", "eggetarian"]),
    languages: z.array(z.string().min(1)).max(11),
    interests: z.array(z.string().min(1)).max(16),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "nothing to update" });

export type UpdateMeDto = z.infer<typeof UpdateMeSchema>;

export const PhotoPresignSchema = z.object({
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export type PhotoPresignDto = z.infer<typeof PhotoPresignSchema>;
