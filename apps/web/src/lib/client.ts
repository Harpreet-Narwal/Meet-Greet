"use client";

/** Browser-side JSON helpers for the BFF routes. */
export async function postJson<T>(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" = "POST",
): Promise<{ ok: boolean; status: number; data: T | null; message: string | null }> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string | string[] })
    | null;
  const rawMessage = data && "message" in (data as object) ? data?.message : null;
  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? data : null,
    message: Array.isArray(rawMessage) ? rawMessage.join(", ") : (rawMessage ?? null),
  };
}

export async function getJson<T>(url: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, status: response.status, data: response.ok ? data : null };
}
