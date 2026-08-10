import { Tabs } from "expo-router";
import { Text, View } from "react-native";

import { fonts, trackingLabel, usePalette, type Palette } from "../../lib/theme";

/*
 * Web-only tab bar.
 *
 * Metro picks this over `_layout.tsx` for the web target. It exists because
 * `NativeTabs` has no UITabBar to delegate to in a browser and falls back to a
 * segmented control pinned to the top — which is exactly the "this is a
 * website" impression the native shell is meant to dispel.
 *
 * So web gets an ordinary bottom tab bar styled to match. Native still gets the
 * real thing, including the iOS 26 minimize-on-scroll behaviour, which is not
 * reimplemented here: a scroll-listener imitation stutters against browser
 * momentum scrolling and would look worse than a bar that simply stays put.
 */

/** Simple glyphs — SF Symbols do not exist off-platform. */
function TabGlyph({ name, color }: { name: string; color: string }) {
  return <Text style={{ fontSize: 18, color, lineHeight: 22 }}>{name}</Text>;
}

function label(palette: Palette, focused: boolean) {
  return {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: trackingLabel,
    textTransform: "uppercase" as const,
    color: focused ? palette.ink : palette.inkMuted,
  };
}

export default function WebTabsLayout() {
  const palette = usePalette();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: palette.line,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarItemStyle: { gap: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tables",
          tabBarLabel: ({ focused }) => <Text style={label(palette, focused)}>Tables</Text>,
          tabBarIcon: ({ focused }) => (
            <TabGlyph name="◍" color={focused ? palette.accent : palette.inkMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarLabel: ({ focused }) => <Text style={label(palette, focused)}>Chats</Text>,
          tabBarIcon: ({ focused }) => (
            <TabGlyph name="◇" color={focused ? palette.accent : palette.inkMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarLabel: ({ focused }) => <Text style={label(palette, focused)}>You</Text>,
          tabBarIcon: ({ focused }) => (
            <TabGlyph name="○" color={focused ? palette.accent : palette.inkMuted} />
          ),
        }}
      />
    </Tabs>
  );
}

/** Keeps the module a valid route file if the tabs ever render empty. */
export function Fallback() {
  return <View />;
}
