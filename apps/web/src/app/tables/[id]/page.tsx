import type { Metadata } from "next";

import { TableReveal } from "./table-reveal";

export const metadata: Metadata = {
  title: "Your table",
  robots: { index: false },
};

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TableReveal eventId={id} />;
}
