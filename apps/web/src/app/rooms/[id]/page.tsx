import type { Metadata } from "next";

import { GameRoom } from "./game-room";

export const metadata: Metadata = {
  title: "Game room",
  robots: { index: false },
};

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameRoom eventId={id} />;
}
