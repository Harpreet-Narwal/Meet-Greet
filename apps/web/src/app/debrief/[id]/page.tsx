import type { Metadata } from "next";

import { Debrief } from "./debrief";

export const metadata: Metadata = {
  title: "How was the night?",
  robots: { index: false },
};

export default async function DebriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Debrief eventId={id} />;
}
