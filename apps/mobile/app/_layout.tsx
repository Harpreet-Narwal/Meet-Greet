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

import { usePalette } from "../lib/theme";

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
        headerTitleStyle: { fontFamily: "InstrumentSerif_400Regular", fontSize: 20 },
        contentStyle: { backgroundColor: palette.paper },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Sign in" }} />
      <Stack.Screen name="explore" options={{ title: "Tables" }} />
      <Stack.Screen name="event/[slug]" options={{ title: "" }} />
      <Stack.Screen name="you" options={{ title: "You" }} />
    </Stack>
  );
}
