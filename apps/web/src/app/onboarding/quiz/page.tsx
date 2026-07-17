import type { Metadata } from "next";

import { QuizFlow } from "./quiz-flow";

export const metadata: Metadata = {
  title: "The five-minute quiz",
  robots: { index: false },
};

export default function QuizPage() {
  return <QuizFlow />;
}
