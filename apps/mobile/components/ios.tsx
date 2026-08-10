import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from "react-native";

import { body, haptics, label, radius, space, type, usePalette, type Palette } from "../lib/theme";

/*
 * The iOS vocabulary this app is built from.
 *
 * The first cut of the mobile app was the web layout re-typed in React Native:
 * flat full-bleed rows, a text link where a button belonged, nothing
 * acknowledging a touch. It read as a website in a phone frame, because
 * structurally that is what it was.
 *
 * What makes an app feel native is not the typeface — it is the grammar:
 * content sits in inset grouped sections, rows are tappable with a visible
 * pressed state and a chevron when they lead somewhere, controls are full-width
 * and thumb-reachable, and touches answer back. That grammar lives here so the
 * screens compose it instead of each re-inventing it.
 *
 * The Quiet Editorial palette and type are untouched — this changes the
 * structure and the feel, not the brand.
 */

/** Inset grouped section, the iOS Settings idiom. */
export function Section({
  title,
  footer,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const palette = usePalette();
  return (
    <View style={[{ marginTop: space.sectionSm }, style]}>
      {title ? (
        <Text style={[label(palette), { marginBottom: 8, marginLeft: 4 }]}>{title}</Text>
      ) : null}
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: radius.group,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: palette.line,
        }}
      >
        {children}
      </View>
      {footer ? (
        <Text
          style={[
            body(palette, type.small),
            { color: palette.inkMuted, marginTop: 8, marginLeft: 4 },
          ]}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A row inside a Section. Tappable rows get a pressed fill and a chevron —
 * iOS's contract that a row leads somewhere, which a bare line of text does not
 * make.
 */
export function Row({
  children,
  onPress,
  last,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  accessibilityLabel?: string;
}) {
  const palette = usePalette();
  const inner = (pressed: boolean) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? palette.band : "transparent",
        // Separators inset from the leading edge, as iOS does — a full-bleed
        // rule reads as a table border rather than a list.
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.line,
      }}
    >
      <View style={{ flex: 1 }}>{children}</View>
      {onPress ? <Chevron palette={palette} /> : null}
    </View>
  );

  if (!onPress) return inner(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.select();
        onPress();
      }}
    >
      {({ pressed }) => inner(pressed)}
    </Pressable>
  );
}

/** The iOS disclosure chevron, drawn rather than pulled from an icon font. */
function Chevron({ palette }: { palette: Palette }) {
  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRightWidth: 1.75,
        borderTopWidth: 1.75,
        borderColor: palette.inkMuted,
        transform: [{ rotate: "45deg" }],
        marginLeft: 10,
      }}
    />
  );
}

/**
 * Full-width primary control.
 *
 * `pressed` dims rather than animates: iOS system buttons respond instantly on
 * touch-down, and a spring animation on a commit action reads as sluggish.
 */
export function PrimaryButton({
  title,
  onPress,
  busy,
  disabled,
  tone = "ink",
  testID,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "ink" | "accent";
  testID?: string;
}) {
  const palette = usePalette();
  const background = tone === "accent" ? palette.accent : palette.ink;
  const foreground = tone === "accent" ? palette.onAccent : palette.paper;
  const inert = busy || disabled;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy }}
      disabled={inert}
      onPress={() => {
        haptics.commit();
        onPress();
      }}
      style={({ pressed }) => ({
        backgroundColor: background,
        borderRadius: radius.control,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
        opacity: inert ? 0.5 : pressed ? 0.82 : 1,
        flexDirection: "row",
        gap: 8,
      })}
    >
      {busy ? <ActivityIndicator size="small" color={foreground} /> : null}
      <Text style={[label(palette), { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}

/** Centred loading state that fills its container. */
export function Loading() {
  const palette = usePalette();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.paper,
      }}
    >
      <ActivityIndicator color={palette.accent} />
    </View>
  );
}

/** Empty state with room to say something human. */
export function Empty({ title, note }: { title: string; note?: string }) {
  const palette = usePalette();
  return (
    <View style={{ alignItems: "center", paddingHorizontal: space.gutter, paddingVertical: 56 }}>
      <Text
        style={{
          fontFamily: "InstrumentSerif_400Regular",
          fontSize: type.h3,
          color: palette.ink,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {note ? (
        <Text
          style={[
            body(palette, type.small),
            { color: palette.inkMuted, textAlign: "center", marginTop: 8 },
          ]}
        >
          {note}
        </Text>
      ) : null}
    </View>
  );
}
