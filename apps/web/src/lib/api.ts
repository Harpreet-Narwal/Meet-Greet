import "server-only";

import { cookies } from "next/headers";

/** Internal (server-side) api base — http://api:4000 in compose, localhost in dev. */
export const API_BASE =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const ACCESS_COOKIE = "ml_access";
export const REFRESH_COOKIE = "ml_refresh";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

/** Server-component fetch to the api with the session's bearer token. */
export async function apiFetch<T>(path: string): Promise<{ status: number; data: T | null }> {
  const token = await getAccessToken();
  if (!token) return { status: 401, data: null };
  const response = await fetch(`${API_BASE}/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: (await response.json()) as T };
}
