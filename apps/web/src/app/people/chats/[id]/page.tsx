import type { Metadata } from "next";

import { ChatView } from "./chat-view";

export const metadata: Metadata = {
  title: "Chat",
  robots: { index: false },
};

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatView chatId={id} />;
}
