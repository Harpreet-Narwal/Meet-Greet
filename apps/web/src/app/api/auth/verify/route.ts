import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE, API_BASE, cookieOptions, REFRESH_COOKIE } from "@/lib/api";

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 3600;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const upstream = await fetch(`${API_BASE}/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok || !payload) {
    return NextResponse.json(payload ?? { message: "login failed" }, { status: upstream.status });
  }

  // Does this account already have a personality profile? Routes the next screen.
  let has_personality = false;
  const me = await fetch(`${API_BASE}/v1/me`, {
    headers: { Authorization: `Bearer ${payload.access_token}` },
    cache: "no-store",
  });
  if (me.ok) {
    const meBody = await me.json();
    has_personality = Boolean(meBody?.personality);
  }

  const response = NextResponse.json({ is_new_user: payload.is_new_user, has_personality });
  response.cookies.set(ACCESS_COOKIE, payload.access_token, {
    ...cookieOptions,
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE, payload.refresh_token, {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE,
  });
  return response;
}
