/**
 * Design tokens as plain data, so both clients read the same numbers.
 *
 * `packages/ui/src/tokens.css` is the web's source of truth and this is the
 * mobile app's — two files describing one design system is exactly how a
 * palette drifts. `tokens.test.ts` parses the CSS and asserts the two agree, so
 * a change on one side fails the build until it lands on the other.
 *
 * Full spec, contrast rules and the reasoning: docs/design-system.md.
 */

export const light = {
  paper: "#ede5d9",
  ink: "#16120d",
  inkSoft: "#4a423a",
  inkMuted: "#6e6459",
  line: "#c9bfb0",
  surface: "#e7ded0",
  band: "#e3d9c9",
  accent: "#b95440",
  accentInk: "#9e4632",
  accent2: "#c9a03f",
  onAccent: "#ffffff",
  sage: "#5a6a4a",
  danger: "#9e3b30",
} as const;

export const dark = {
  paper: "#15120e",
  ink: "#ede5d9",
  inkSoft: "#b3a899",
  inkMuted: "#8a8073",
  line: "#3a332b",
  surface: "#1f1a15",
  band: "#1f1a15",
  accent: "#d2694f",
  accentInk: "#de8067",
  accent2: "#d9ac50",
  onAccent: "#15120e",
  sage: "#a6b396",
  danger: "#c4574a",
} as const;

/**
 * Structural, not `typeof light` — with `as const` each hex is its own literal
 * type, so the dark palette would not be assignable to the light one and every
 * `usePalette()` consumer would fail to typecheck. The values stay `as const`
 * because tokens.test.ts compares them against the stylesheet.
 */
export type Palette = { readonly [K in keyof typeof light]: string };

/**
 * The web scale is fluid (`clamp()` against the viewport); a phone has one
 * width, so these are the sizes that clamp settles on at phone widths — the
 * lower half of each web clamp, not the desktop maximum.
 */
export const type = {
  displayXl: 40,
  display: 34,
  h1: 29,
  h2: 25,
  h3: 20,
  h4: 17,
  lead: 17,
  body: 16,
  small: 14,
  label: 11,
} as const;

export const lineHeight = {
  display: 0.94,
  heading: 1.12,
  body: 1.65,
} as const;

/** Uppercase micro-labels are unreadable without it. */
export const trackingLabel = 1.4;

export const space = {
  gutter: 20,
  section: 44,
  sectionSm: 28,
  gap: 12,
} as const;

export const fonts = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  body: "Newsreader_400Regular",
  mono: "JetBrainsMono_500Medium",
} as const;
