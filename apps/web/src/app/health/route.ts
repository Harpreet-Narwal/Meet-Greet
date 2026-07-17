import type { HealthResponse } from "@mulaqat/types";

export function GET(): Response {
  const body: HealthResponse = { status: "ok", service: "web" };
  return Response.json(body);
}
