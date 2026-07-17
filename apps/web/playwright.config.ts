import { defineConfig } from "@playwright/test";

/**
 * Runs against a live stack (make up && make seed) — no webServer here on
 * purpose: the flow exercises web + api + ai + postgres + redis together.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    // Springs never "settle" for Playwright's stability check; the app honors
    // prefers-reduced-motion (MotionConfig reducedMotion="user"), so emulate it.
    contextOptions: { reducedMotion: "reduce" },
  },
});
