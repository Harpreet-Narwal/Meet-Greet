import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE, API_BASE, cookieOptions, REFRESH_COOKIE } from "@/lib/api";

/**
 * Authenticated BFF proxy: browser → /api/bff/<path> → api /v1/<path> with the
 * session bearer. Auto-refreshes once on 401 and rotates the cookies.
 * Only the paths the app actually uses are proxied.
 */
const UUID = "[0-9a-f-]{36}";
const ALLOWED_PATTERNS = [
  /^quiz$/,
  /^quiz\/responses$/,
  /^me$/,
  /^me\/photo$/,
  /^me\/bookings$/,
  new RegExp(`^events/${UUID}/bookings$`),
  new RegExp(`^events/${UUID}/my-table$`),
  new RegExp(`^events/${UUID}/checkin-token$`),
  new RegExp(`^events/${UUID}/checkin$`),
  new RegExp(`^bookings/${UUID}$`),
  new RegExp(`^bookings/${UUID}/two-truths$`),
];

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const joined = path.join("/");
  if (!ALLOWED_PATTERNS.some((pattern) => pattern.test(joined))) {
    return NextResponse.json({ message: "not found" }, { status: 404 });
  }

  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let rotated: { access_token: string; refresh_token: string } | null = null;

  if (!access && !refresh) {
    return NextResponse.json({ message: "not signed in" }, { status: 401 });
  }

  const body = request.method === "GET" ? undefined : await request.text();
  const call = (token: string) =>
    fetch(`${API_BASE}/v1/${joined}${request.nextUrl.search}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });

  let upstream = access ? await call(access) : null;

  if ((upstream === null || upstream.status === 401) && refresh) {
    const refreshed = await fetch(`${API_BASE}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (refreshed.ok) {
      rotated = await refreshed.json();
      access = rotated!.access_token;
      upstream = await call(access);
    }
  }

  if (upstream === null) {
    return NextResponse.json({ message: "not signed in" }, { status: 401 });
  }

  const response = new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
  if (rotated) {
    response.cookies.set(ACCESS_COOKIE, rotated.access_token, {
      ...cookieOptions,
      maxAge: 15 * 60,
    });
    response.cookies.set(REFRESH_COOKIE, rotated.refresh_token, {
      ...cookieOptions,
      maxAge: 30 * 24 * 3600,
    });
  }
  return response;
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function POST(request: NextRequest, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function PATCH(request: NextRequest, context: Context) {
  return proxy(request, (await context.params).path);
}
export async function DELETE(request: NextRequest, context: Context) {
  return proxy(request, (await context.params).path);
}
