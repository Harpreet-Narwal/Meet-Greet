import { NextResponse } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.redirect(
    new URL("/", process.env.APP_URL ?? "http://localhost:3000"),
    { status: 303 },
  );
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
