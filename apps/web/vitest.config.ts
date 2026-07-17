import { defineConfig } from "vitest/config";

// Unit tests only — the e2e/ directory belongs to Playwright.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
