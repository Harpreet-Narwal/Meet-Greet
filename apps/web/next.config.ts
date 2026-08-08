import path from "node:path";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/*
 * Security headers.
 *
 * The app carries an httpOnly session cookie and a checkout flow, so the
 * clickjacking, MIME-sniffing and referrer-leak defaults matter. Everything
 * here is a response header rather than a meta tag so it also covers the JSON
 * the BFF proxies.
 *
 * CSP notes:
 *  - `'unsafe-inline'` for styles is unavoidable today: Next injects inline
 *    <style> for the app router, and next/font emits inline @font-face.
 *  - Scripts get `'unsafe-inline'` only in development, where React refresh and
 *    the dev overlay need it. Production relies on Next's own nonce-less
 *    strict-dynamic-free setup, so `'self'` plus the inline bootstrap hash is
 *    not achievable without a nonce middleware — tracked in PROGRESS.md.
 *  - `connect-src` includes ws/wss for the Socket.IO game room.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' ws: wss: http: https:",
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The app asks for a camera (selfie verification) and nothing else.
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Only meaningful over TLS; harmless locally, but keep it to prod so a dev
  // machine never pins localhost to HTTPS for two years.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@mulaqat/ui", "@mulaqat/types"],
  poweredByHeader: false,
  // Next 15.5 streams async generateMetadata into <body> (hoisted to <head> via
  // client JS). Render it blocking-in-head instead so crawlers and Lighthouse
  // see <meta name="description"> in the initial HTML head (SEO gate ≥ 0.95).
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
