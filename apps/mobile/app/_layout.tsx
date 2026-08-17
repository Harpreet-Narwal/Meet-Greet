import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { fonts, type, usePalette } from "../lib/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const palette = usePalette();
  const [loaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Newsreader_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    // Hold the splash until the three faces are in — the whole design leans on
    // them, and a flash of system serif is worse than 200ms more splash.
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.paper },
        headerTintColor: palette.ink,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: type.h4 },
        // The iOS large title: big and inline with the content at rest, then
        // collapsing into the bar as you scroll. It is the strongest native
        // signal a screen can give, and it is why the tab screens carry no
        // hand-rolled heading of their own any more.
        headerLargeTitleStyle: { fontFamily: fonts.display, fontSize: type.h1, color: palette.ink },
        headerLargeTitleShadowVisible: false,
        contentStyle: { backgroundColor: palette.paper },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Sign-in and onboarding are sheets, not pushes. They interrupt what you
          were doing and hand you back to it — the modal presentation says that
          without a word of copy, and gives the swipe-down people expect. */}
      <Stack.Screen name="login" options={{ presentation: "modal", title: "Sign in" }} />
      <Stack.Screen
        name="onboarding"
        options={{
          presentation: "modal",
          title: "About you",
          // No swipe-away: leaving half-finished strands the account without a
          // profile, which is what made a new sign-in land nowhere.
          gestureEnabled: false,
        }}
      />

      <Stack.Screen name="event/[slug]" options={{ title: "" }} />
      <Stack.Screen name="chat/[id]" options={{ title: "" }} />
      <Stack.Screen name="room/[tableId]" options={{ title: "At the table" }} />
    </Stack>
  );
}
