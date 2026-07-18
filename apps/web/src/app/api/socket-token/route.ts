import { NextResponse } from "next/server";

import { ACCESS_COOKIE } from "@/lib/api";
import { cookies } from "next/headers";

/**
 * Hands the httpOnly access token to the client for the Socket.IO handshake.
 * The token never touches JS storage otherwise; the socket auth needs it in the
 * handshake payload.
 */
export async function GET(): Promise<NextResponse> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ token: null }, { status: 401 });
  return NextResponse.json({ token });
}
