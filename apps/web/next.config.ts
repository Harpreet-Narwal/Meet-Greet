import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@mulaqat/ui", "@mulaqat/types"],
  // Next 15.5 streams async generateMetadata into <body> (hoisted to <head> via
  // client JS). Render it blocking-in-head instead so crawlers and Lighthouse
  // see <meta name="description"> in the initial HTML head (SEO gate ≥ 0.95).
  htmlLimitedBots: /.*/,
};

export default nextConfig;
