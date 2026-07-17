import type { Metadata } from "next";

import { ResultReveal } from "./result-reveal";

export const metadata: Metadata = {
  title: "Your archetype",
  robots: { index: false },
};

export default function ResultPage() {
  return <ResultReveal />;
}
