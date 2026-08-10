import Constants from "expo-constants";

import { deleteItem, getItem, setItem } from "./secure-store";

/**
 * Talks to the same NestJS api the web app uses.
 *
 * The web keeps its tokens in httpOnly cookies behind a BFF proxy, which a
 * native client cannot do — so the tokens live in the OS keychain and go out as
 * a bearer header. Same api, same contracts, different transport for the
 * credential. See `secure-store.ts` for where that lands per platform.
 */
const ACCESS = "mulaqat.access";
const REFRESH = "mulaqat.refresh";

const CONFIGURED = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1)\b/i;

/**
 * Where the api lives.
 *
 * `localhost` is a trap on a real phone: it resolves to the handset itself, not
 * to the laptop running the api, so every call dies in `fetch` and surfaces as
 * the bare "No connection" state below. It only looks fine in the simulator and
 * on Expo Web, which genuinely do share a loopback with the api.
 *
 * Expo already knows the right address — `hostUri` is where the device just
 * fetched the bundle from — so borrow that hostname and keep the api's port.
 * A non-loopback `extra.apiUrl` always wins: that is the production path, where
 * there is no dev server to borrow from.
 */
function resolveBase(): string {
  if (CONFIGURED && !LOOPBACK.test(CONFIGURED)) return CONFIGURED;

  const port = CONFIGURED?.match(/:(\d+)/)?.[1] ?? "4000";
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && !["localhost", "127.0.0.1"].includes(host)) return `http://${host}:${port}`;

  return CONFIGURED ?? "http://localhost:4000";
}

const BASE = resolveBase();

export async function setSession(access: string, refresh: string): Promise<void> {
  await setItem(ACCESS, access);
  await setItem(REFRESH, refresh);
}

export async function clearSession(): Promise<void> {
  await deleteItem(ACCESS);
  await deleteItem(REFRESH);
}

export async function getAccess(): Promise<string | null> {
  return getItem(ACCESS);
}

export interface Result<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message?: string;
}

async function call<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<Result<T>> {
  const { token, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${BASE}/v1${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.headers ?? {}),
      },
    });
  } catch {
    // A phone loses signal mid-tap constantly; that is not an exception, it is
    // a state the screen has to render.
    return { ok: false, status: 0, data: null, message: "No connection — try again." };
  }
  const body = (await response.json().catch(() => null)) as
    | (T & { message?: string })
    | null;
  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? body : null,
    message: !response.ok ? (body?.message ?? "Something went wrong.") : undefined,
  };
}

/** Unauthenticated call — public listings, OTP. */
export function apiPublic<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  return call<T>(path, init);
}

/**
 * Authenticated call. Refreshes once on a 401 and retries, mirroring what the
 * web BFF does, so a stale access token never surfaces as a logout.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  const token = await getAccess();
  const first = await call<T>(path, { ...init, token });
  if (first.status !== 401) return first;

  const refresh = await getItem(REFRESH);
  if (!refresh) return first;
  const rotated = await call<{ access_token: string; refresh_token: string }>(
    "/auth/refresh",
    { method: "POST", body: JSON.stringify({ refresh_token: refresh }) },
  );
  if (!rotated.ok || !rotated.data) {
    await clearSession();
    return first;
  }
  await setSession(rotated.data.access_token, rotated.data.refresh_token);
  return call<T>(path, { ...init, token: rotated.data.access_token });
}
