import * as Haptics from "expo-haptics";
import { Platform, useColorScheme } from "react-native";

import { dark, fonts, light, lineHeight, space, trackingLabel, type } from "@mulaqat/tokens";
import type { Palette } from "@mulaqat/tokens";

export { fonts, lineHeight, space, trackingLabel, type };

/**
 * Corner radii, native-only.
 *
 * Deliberately not in `packages/tokens`: the web design is squared-off by
 * intent, while iOS reads a sharp-cornered container as a web page embedded in
 * an app. These are a platform idiom rather than a brand decision, so they live
 * here instead of in the shared palette the parity test guards.
 */
export const radius = {
  /** Grouped-list sections and cards — matches iOS inset grouped tables. */
  group: 12,
  /** Full-width buttons. */
  control: 14,
  /** Chat bubbles. */
  bubble: 20,
} as const;

/**
 * Taptic feedback.
 *
 * The single biggest reason an app "feels like a website" is that nothing
 * answers back when you touch it. Confined to real state changes — a booking, a
 * sent message, a completed step — because haptics on every tap becomes noise
 * people turn off.
 *
 * Android has no equivalent vocabulary and the effects land as a buzz, so this
 * is iOS-only. No-ops in the simulator, which has no Taptic Engine.
 */
export const haptics = {
  select(): void {
    if (Platform.OS === "ios") void Haptics.selectionAsync();
  },
  commit(): void {
    if (Platform.OS === "ios") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success(): void {
    if (Platform.OS === "ios") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warn(): void {
    if (Platform.OS === "ios") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};

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

/**
 * The resolved appearance, for the handful of places that need the *name* of
 * the scheme rather than a colour — the status bar being the main one, since
 * iOS wants "light content" / "dark content", not a hex value.
 *
 * Defaults to light when the OS reports null, matching the web app, where light
 * is the default and dark is opt-in.
 */
export function useScheme(): "light" | "dark" {
  return useColorScheme() === "dark" ? "dark" : "light";
}
