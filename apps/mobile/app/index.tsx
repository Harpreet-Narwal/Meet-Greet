import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAccess } from "../lib/api";
import { body, display, label, space, type, usePalette } from "../lib/theme";

/**
 * The hero, carried over from the web: the mixed-face headline is the whole
 * identity, so it is the first thing on the phone too — roman caps with one
 * lowercase italic phrase.
 */
export default function Home() {
  const palette = usePalette();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Already signed in? Skip the marketing hero — a returning user wants their
    // table, not the pitch.
    void (async () => {
      const token = await getAccess();
      if (token) router.replace("/explore");
      else setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView contentContainerStyle={{ padding: space.gutter, flexGrow: 1, justifyContent: "center" }}>
        <Text style={label(palette)}>Bengaluru — now seating</Text>

        <Text style={[display(palette, type.displayXl), { marginTop: 20, textTransform: "uppercase" }]}>
          Tables that{"\n"}turn strangers{"\n"}into{" "}
          <Text style={{ fontFamily: "InstrumentSerif_400Regular_Italic", textTransform: "lowercase" }}>
            your people
          </Text>
        </Text>

        <View style={{ height: 1, backgroundColor: palette.line, marginVertical: 24 }} />

        {["Six seats a table", "Wed & Sat, 8pm", "Venue revealed T-24h", "From ₹99"].map((line) => (
          <Text key={line} style={[label(palette), { marginBottom: 6 }]}>
            {line}
          </Text>
        ))}

        <Link href="/login" asChild>
          <Pressable
            style={{ backgroundColor: palette.ink, paddingVertical: 16, alignItems: "center", marginTop: 28 }}
          >
            <Text style={[label(palette), { color: palette.paper }]}>Find your table</Text>
          </Pressable>
        </Link>

        <Link href="/explore" asChild>
          <Pressable
            style={{
              borderWidth: 1,
              borderColor: palette.line,
              paddingVertical: 16,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <Text style={label(palette)}>Just browsing</Text>
          </Pressable>
        </Link>

        <Text style={[body(palette, type.small), { color: palette.inkSoft, marginTop: 28 }]}>
          A five-minute quiz seats you with five people you&apos;ll actually click with.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
