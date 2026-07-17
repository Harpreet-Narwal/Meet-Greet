import { z } from "zod";

export const PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "phone must be E.164, e.g. +919876543210");

export const OtpRequestSchema = z.object({ phone: PhoneSchema });
export type OtpRequestDto = z.infer<typeof OtpRequestSchema>;

export const OtpVerifySchema = z.object({
  phone: PhoneSchema,
  code: z.string().regex(/^\d{6}$/, "code is 6 digits"),
});
export type OtpVerifyDto = z.infer<typeof OtpVerifySchema>;

export const RefreshSchema = z.object({ refresh_token: z.string().min(10) });
export type RefreshDto = z.infer<typeof RefreshSchema>;

export interface JwtPayload {
  sub: string;
  role: "user" | "host" | "admin";
  type: "access" | "refresh";
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}
