import Constants from "expo-constants";
import { io, type Socket } from "socket.io-client";

import { api, getAccess } from "./api";

/**
 * Socket connections for the live surfaces (chat and the game room).
 *
 * The web reaches these through a `/api/socket-token` hop, because its access
 * token lives in an httpOnly cookie its own JavaScript cannot read. A native
 * client holds the token itself, so it goes straight into the handshake — the
 * gateway already accepts `handshake.auth.token`.
 *
 * The host is derived the same way as the REST base (see `api.ts`): `localhost`
 * on a real handset means the handset, so the address has to come from the dev
 * server Expo loaded the bundle from.
 */
const CONFIGURED = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1)\b/i;

function socketBase(): string {
  if (CONFIGURED && !LOOPBACK.test(CONFIGURED)) return CONFIGURED;
  const port = CONFIGURED?.match(/:(\d+)/)?.[1] ?? "4000";
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && !["localhost", "127.0.0.1"].includes(host)) return `http://${host}:${port}`;
  return CONFIGURED ?? "http://localhost:4000";
}

/**
 * Connect to a namespace, or resolve null when there is no session.
 *
 * `transports: ["websocket"]` skips the long-polling handshake: on a phone the
 * HTTP upgrade dance is wasted round-trips over a slow link, and React Native's
 * fetch stack does not need the fallback a browser sometimes does.
 */
export async function connectSocket(namespace: "/chat" | "/games"): Promise<Socket | null> {
  if (!(await getAccess())) return null;

  /*
   * Refresh before connecting.
   *
   * The gateway verifies the access token once, at handshake, and disconnects
   * on a bad one. Unlike the REST layer there is no refresh-and-retry inside a
   * socket — so a token that expired while the app sat in the background made
   * the live channel fail to open, permanently and silently, and the only clue
   * was a bare "WebSocket connection failed" in the console.
   *
   * A cheap authenticated call runs the existing refresh-on-401 path in
   * `api()`, so whatever we read afterwards is valid. One round-trip per
   * connection, which is nothing against a socket that lives for the session.
   */
  const probe = await api("/me");
  if (probe.status === 401) return null;

  const token = await getAccess();
  if (!token) return null;

  return io(`${socketBase()}${namespace}`, {
    auth: { token },
    transports: ["websocket"],
  });
}

export type { Socket };
