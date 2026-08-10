import { useColorScheme } from "react-native";

import { dark, fonts, light, lineHeight, space, trackingLabel, type } from "@mulaqat/tokens";
import type { Palette } from "@mulaqat/tokens";

export { fonts, lineHeight, space, trackingLabel, type };

/**
 * Unlike the web — where light is the default and dark is an explicit opt-in
 * stored in localStorage — a phone has a real OS-level setting that people
 * expect apps to obey. So this follows the system.
 */
export function usePalette() {
  return useColorScheme() === "dark" ? dark : light;
}

export type { Palette } from "@mulaqat/tokens";

/** Uppercase mono micro-label — the same voice as the web `.label`. */
export function label(palette: Palette) {
  return {
    fontFamily: fonts.mono,
    fontSize: type.label,
    letterSpacing: trackingLabel,
    textTransform: "uppercase" as const,
    color: palette.inkMuted,
  };
}

/** Display voice: the serif, tight, used for headings and event titles. */
export function display(palette: Palette, size: number = type.h2) {
  return {
    fontFamily: fonts.display,
    fontSize: size,
    lineHeight: size * lineHeight.heading,
    color: palette.ink,
  };
}

export function body(palette: Palette, size: number = type.body) {
  return {
    fontFamily: fonts.body,
    fontSize: size,
    lineHeight: size * lineHeight.body,
    color: palette.ink,
  };
}
