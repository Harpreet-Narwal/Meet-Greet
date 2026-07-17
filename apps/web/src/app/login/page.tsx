import type { Metadata } from "next";

import { LoginFlow } from "./login-flow";

export const metadata: Metadata = {
  title: "Pull up a chair",
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginFlow />;
}
