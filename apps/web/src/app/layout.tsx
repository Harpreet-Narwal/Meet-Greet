import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { BRAND_NAME, BRAND_NAME_DISPLAY } from "@mulaqat/types";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const description =
  "A 5-minute personality quiz, a curated table of six, and one great evening in your city. Meet people you'd actually like — over dinner, a run, or a game night.";

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME_DISPLAY} — dinner with six strangers, chosen for you`,
    template: `%s · ${BRAND_NAME_DISPLAY}`,
  },
  description,
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: {
    siteName: BRAND_NAME,
    title: `${BRAND_NAME_DISPLAY} — dinner with six strangers, chosen for you`,
    description,
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: `${BRAND_NAME_DISPLAY} — dinner with six strangers, chosen for you`,
    description,
  },
};

// Light is the default regardless of OS setting, so this is a single colour
// rather than a prefers-color-scheme pair.
export const viewport: Viewport = {
  themeColor: "#fffefd",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND_NAME_DISPLAY,
  description,
  areaServed: "Bengaluru, India",
  logo: "/icon.svg",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the head script stamps `js`/`data-theme` on
    // <html> pre-hydration by design
    <html lang="en" className={inter.variable} data-theme="light" suppressHydrationWarning>
      <head>
        {/* Gate hidden-until-reveal styles on JS actually running (no-JS users see
            everything), and restore an opted-into dark theme before first paint.
            The OS preference is deliberately ignored: a first visit is light. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `document.documentElement.classList.add("js");` +
              `try{var t=localStorage.getItem("mulaqat-theme");` +
              `if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
