import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginFlow } from "./login-flow";

export const metadata: Metadata = {
  title: "Pull up a chair",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    // Suspense: useSearchParams (the ?next redirect) opts the page out of full prerender
    <Suspense>
      <LoginFlow />
    </Suspense>
  );
}
