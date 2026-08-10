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
  // Mail. Dev points at Mailhog (docker-compose, inbox on :8025); production
  // swaps the host for a real relay. Unset SMTP_HOST simply disables sending.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default("Mulaqat <hello@mulaqat.app>"),
  // Browser origins allowed to call the api directly, comma-separated.
  //
  // Empty by default, and that is the correct production value: real browsers
  // reach the api through the Next.js BFF server-side, where CORS never
  // applies. This exists for the Expo Web target during development, which is
  // a genuine browser on its own origin. Native builds ignore CORS entirely.
  CORS_ORIGINS: z.string().default(""),
  AI_URL: z.string().url().default("http://localhost:8000"),
  INTERNAL_API_TOKEN: z.string().default("dev-internal-token-change-me"),
  AUTH_SECRET: z.string().default("dev-auth-secret-change-me"),
  OTP_PROVIDER: z.enum(["mock", "msg91", "twilio"]).default("mock"),
  PAYMENT_PROVIDER: z.enum(["mock", "razorpay"]).default("mock"),
  // Razorpay. Unset by default and never committed — with PAYMENT_PROVIDER=mock
  // none of these are read. Test keys (rzp_test_…) exercise the full hosted
  // checkout, UPI included, without moving real money.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  // Chosen in the Razorpay dashboard; separate from the API key pair. Without
  // it the webhook cannot be trusted, so it refuses every call.
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  // Browser-reachable base for stored object URLs (defaults to S3_ENDPOINT;
  // in compose the internal endpoint is http://minio:9000 but photos are
  // fetched by the browser via localhost).
  S3_PUBLIC_URL: z.string().optional(),
  S3_BUCKET: z.string().default("mulaqat"),
  S3_ACCESS_KEY: z.string().default("mulaqat"),
  S3_SECRET_KEY: z.string().default("mulaqat123"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
