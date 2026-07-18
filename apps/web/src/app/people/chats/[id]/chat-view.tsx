"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { Button, LogoMark, cn } from "@mulaqat/ui";

import { getJson } from "@/lib/client";

interface Message {
  id: string;
  body: string;
  sender_id: string;
  sender_name: string | null;
  created_at: string;
}

const SOCKET_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") ?? "ws://localhost:4000";

export function ChatView({ chatId }: { chatId: string }) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [meRes, msgRes, tokenRes] = await Promise.all([
        getJson<{ user: { id: string } }>("/api/bff/me"),
        getJson<Message[]>(`/api/bff/chats/${chatId}/messages`),
        getJson<{ token: string }>("/api/socket-token"),
      ]);
      if (!active) return;
      if (meRes.status === 401 || !tokenRes.data?.token) {
        return router.replace(`/login?next=/people/chats/${chatId}`);
      }
      setMe(meRes.data?.user.id ?? null);
      setMessages(msgRes.data ?? []);

      const socket = io(`${SOCKET_BASE}/chat`, {
        auth: { token: tokenRes.data.token },
        transports: ["websocket"],
      });
      socketRef.current = socket;
      socket.on("connect", () => socket.emit("chat:join", { chat_id: chatId }));
      socket.io.on("reconnect", () => socket.emit("chat:join", { chat_id: chatId }));
      socket.on("chat:message", (m: Message) =>
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
      );
      socket.on("error:send", (e: { message: string }) => setError(e.message));
    })();
    return () => {
      active = false;
      socketRef.current?.disconnect();
    };
  }, [chatId, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    socketRef.current?.emit("chat:send", { chat_id: chatId, body });
    setDraft("");
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="nav-blur flex items-center gap-3 border-b border-line/60 px-5 py-3">
        <Link href="/people" aria-label="Back to people" className="text-ink-soft hover:text-ink">
          ←
        </Link>
        <LogoMark size={22} className="text-ink" />
        <span className="text-[15px] font-semibold">Chat</span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6" data-testid="messages">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2.5">
          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug",
                    mine ? "bg-accent text-on-accent" : "bg-surface border border-line",
                  )}
                >
                  {!mine ? (
                    <span className="mb-0.5 block text-[11px] font-semibold text-ink-soft">
                      {m.sender_name}
                    </span>
                  ) : null}
                  {m.body}
                </div>
              </div>
            );
          })}
          {messages.length === 0 ? (
            <p className="mt-10 text-center text-[15px] text-ink-soft">
              Say the first hello. Date-idea prompts land here soon.
            </p>
          ) : null}
        </div>
      </div>

      <form onSubmit={send} className="border-t border-line px-5 py-3">
        <div className="mx-auto flex w-full max-w-lg gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            className="h-11 flex-1 rounded-full border border-line bg-paper px-4 outline-none focus-visible:border-accent"
            data-testid="chat-input"
            maxLength={2000}
          />
          <Button type="submit" data-testid="chat-send">Send</Button>
        </div>
        {error ? <p role="alert" className="mx-auto mt-2 max-w-lg text-[13px] text-danger">{error}</p> : null}
      </form>
    </div>
  );
}
