import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { dark, light, type Palette } from "./index";

/**
 * Two files describe one palette: this package (mobile) and
 * `packages/ui/src/tokens.css` (web). Nothing stops them drifting apart except
 * this test — and drift in this codebase has a track record, so it is worth a
 * few lines.
 */
const css = readFileSync(
  fileURLToPath(new URL("../../ui/src/tokens.css", import.meta.url)),
  "utf8",
);

/** Pull one `--var: #hex;` out of a given CSS block. */
function readVar(block: string, name: string): string | null {
  const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  return match ? match[1]!.toLowerCase() : null;
}

const lightBlock = css.slice(css.indexOf(":root,"), css.indexOf('[data-theme="dark"]'));
const darkBlock = css.slice(css.indexOf('[data-theme="dark"]'));

/** JS camelCase → the CSS custom property it mirrors. */
const NAMES: Record<keyof Palette, string> = {
  paper: "paper",
  ink: "ink",
  inkSoft: "ink-soft",
  inkMuted: "ink-muted",
  line: "line",
  surface: "surface",
  band: "band",
  accent: "accent",
  accentInk: "accent-ink",
  accent2: "accent-2",
  onAccent: "on-accent",
  sage: "sage",
  danger: "danger",
};

describe("design tokens stay in sync with the web stylesheet", () => {
  for (const [key, cssName] of Object.entries(NAMES) as [keyof Palette, string][]) {
    it(`light --${cssName}`, () => {
      expect(readVar(lightBlock, cssName)).toBe(light[key].toLowerCase());
    });
  }

  for (const [key, cssName] of Object.entries(NAMES) as [keyof Palette, string][]) {
    it(`dark --${cssName}`, () => {
      const fromCss = readVar(darkBlock, cssName);
      // The dark block only redeclares what changes; anything it leaves alone
      // is inherited from light, so that is what mobile should carry too.
      expect(fromCss ?? readVar(lightBlock, cssName)).toBe(dark[key].toLowerCase());
    });
  }
});
