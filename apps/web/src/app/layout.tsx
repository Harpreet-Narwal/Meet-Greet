import type { Metadata, Viewport } from "next";
import { Instrument_Serif, JetBrains_Mono, Newsreader } from "next/font/google";

import { BRAND_NAME, BRAND_NAME_DISPLAY } from "@mulaqat/types";

import "./globals.css";

/*
 * Three faces, three jobs (docs/design-system.md §4). Self-hosted by next/font —
 * no CDN request, no layout shift. Display carries the headlines and their
 * italic counter-voice; body sets all reading text; mono handles every number
 * the product shows — ₹399, "2 seats left", T-24:00:00, Table 03.
 */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

const body = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
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
  themeColor: "#ede5d9",
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
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
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
