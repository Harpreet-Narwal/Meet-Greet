"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { getJson } from "./client";

export interface Player {
  user_id: string;
  first_name: string;
}
export interface Card {
  id: string;
  text: string;
  answer?: string | null;
}
export interface GameState {
  kind: "icebreaker" | "hot_takes" | "most_likely" | "trivia" | "two_truths";
  phase: "lobby" | "card" | "voting" | "reveal" | "ended";
  players: Player[];
  cards: Card[];
  cardIndex: number;
  level: number;
  scores: Record<string, number>;
  votes: Record<string, string>;
  result: Record<string, unknown> | null;
  startedBy: string;
}

const SOCKET_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") ?? "ws://localhost:4000";

export function useGameSocket(tableId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tableId) return;
    let active = true;

    (async () => {
      const res = await getJson<{ token: string }>("/api/socket-token");
      if (!active || !res.data?.token) {
        setError("Sign in to join the game room.");
        return;
      }
      const socket = io(`${SOCKET_BASE}/games`, {
        auth: { token: res.data.token },
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("room:join", { table_id: tableId });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("room:state", (next: GameState) => setState(next));
      socket.on("error:join", (e: { message: string }) => setError(e.message));
      socket.on("error:auth", (e: { message: string }) => setError(e.message));
      socket.io.on("reconnect", () => socket.emit("room:join", { table_id: tableId }));
    })();

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [tableId]);

  function emit(event: string, payload: Record<string, unknown>) {
    socketRef.current?.emit(event, { table_id: tableId, ...payload });
  }

  return { connected, state, error, emit };
}
