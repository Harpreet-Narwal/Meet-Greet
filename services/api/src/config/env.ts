import { z } from "zod";

/**
 * Every env var the api reads, validated once at boot (Zod at every boundary — CLAUDE.md).
 * Defaults target host-local dev (published compose ports); docker compose overrides via .env.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .default("postgresql://mulaqat:mulaqat@localhost:5432/mulaqat"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  AI_URL: z.string().url().default("http://localhost:8000"),
  INTERNAL_API_TOKEN: z.string().default("dev-internal-token-change-me"),
  AUTH_SECRET: z.string().default("dev-auth-secret-change-me"),
  OTP_PROVIDER: z.enum(["mock", "msg91", "twilio"]).default("mock"),
  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_BUCKET: z.string().default("mulaqat"),
  S3_ACCESS_KEY: z.string().default("mulaqat"),
  S3_SECRET_KEY: z.string().default("mulaqat123"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
