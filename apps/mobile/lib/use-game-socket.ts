import { useEffect, useRef, useState } from "react";

import { connectSocket, type Socket } from "./sockets";

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

/**
 * The game room's live state.
 *
 * Mirrors the web hook against the same `/games` namespace and the same events,
 * so the two clients can sit at one table — the whole point of the room is that
 * six people are in it at once, and half of them may be on the web.
 *
 * The server owns the state machine: every action is emitted and the next
 * authoritative `room:state` is what renders. Nothing is applied optimistically,
 * because a phone that guessed wrong would show a different card from everyone
 * else at the table.
 */
export function useGameSocket(tableId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tableId) return;
    let active = true;

    void (async () => {
      const socket = await connectSocket("/games");
      if (!socket) {
        setError("Sign in to join the game room.");
        return;
      }
      if (!active) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;

      const join = () => socket.emit("room:join", { table_id: tableId });
      socket.on("connect", () => {
        setConnected(true);
        join();
      });
      socket.on("disconnect", () => setConnected(false));
      // Rejoin on reconnect or the room is silently lost when the app is
      // backgrounded mid-game — which on a phone at dinner is constant.
      socket.io.on("reconnect", join);
      socket.on("room:state", (next: GameState) => setState(next));
      socket.on("error:join", (e: { message: string }) => setError(e.message));
      socket.on("error:auth", (e: { message: string }) => setError(e.message));
    })();

    return () => {
      active = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [tableId]);

  function emit(event: string, payload: Record<string, unknown> = {}) {
    socketRef.current?.emit(event, { table_id: tableId, ...payload });
  }

  return { connected, state, error, emit };
}
