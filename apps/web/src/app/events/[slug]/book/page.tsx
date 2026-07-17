import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { publicApi, type PublicEvent } from "@/lib/public-api";

import { BookingFlow } from "./booking-flow";

export const metadata: Metadata = {
  title: "Book your seat",
  robots: { index: false },
};

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await publicApi<PublicEvent>(`/events/${slug}`, 0);
  if (!event) notFound();
  return <BookingFlow event={event} />;
}
