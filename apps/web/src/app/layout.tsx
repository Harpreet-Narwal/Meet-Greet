import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { BRAND_NAME_DISPLAY } from "@mulaqat/types";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME_DISPLAY} — dinner with six strangers, chosen for you`,
    template: `%s · ${BRAND_NAME_DISPLAY}`,
  },
  description:
    "A 5-minute personality quiz, a curated table of six, and one great evening in your city. Meet people you'd actually like — over dinner, a run, or a game night.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#121009" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
