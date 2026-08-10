import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { apiPublic, clearSession, getAccess } from "../lib/api";
import { body, display, label, space, type, usePalette, type Palette } from "../lib/theme";

interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  type: string;
  starts_at: string;
  price_inr: number;
  seats_left: number;
  women_only: boolean;
  men_only: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  dinner: "Dinner",
  run_club: "Run club",
  game_night: "Game night",
  chai: "Chai & chill",
  trek: "Trek",
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/**
 * The events index — the same typographic list the web uses rather than photo
 * cards. It reads even better on a phone: rows stay scannable in one column,
 * where cards would force a single-file stack of near-identical images.
 */
function Row({ event, palette }: { event: PublicEvent; palette: Palette }) {
  const soldOut = event.seats_left === 0;
  const almostFull = event.seats_left > 0 && event.seats_left <= 3;
  const restriction = event.women_only ? " · Women only" : event.men_only ? " · Men only" : "";

  return (
    <Link href={`/event/${event.slug}`} asChild>
      <Pressable
        style={{ paddingVertical: 18, borderTopWidth: 1, borderTopColor: palette.line, opacity: soldOut ? 0.55 : 1 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={label(palette)}>{formatWhen(event.starts_at)} IST</Text>
          <Text style={[label(palette), { color: palette.ink }]}>
            {event.price_inr === 0 ? "Free" : `₹${event.price_inr}`}
          </Text>
        </View>

        <Text style={[display(palette, type.h3), { marginTop: 6, textTransform: "uppercase" }]}>
          {event.title}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={label(palette)}>
            {TYPE_LABELS[event.type] ?? event.type}
            {restriction}
          </Text>
          <Text
            style={[
              label(palette),
              almostFull ? { color: palette.accentInk } : soldOut ? {} : {},
            ]}
          >
            {soldOut ? "Waitlist open" : `${event.seats_left} seat${event.seats_left === 1 ? "" : "s"} left`}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

export default function Explore() {
  const palette = usePalette();
  const router = useRouter();
  const [events, setEvents] = useState<PublicEvent[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const load = useCallback(async () => {
    const result = await apiPublic<PublicEvent[]>("/events?city=bangalore");
    setEvents(result.data ?? []);
    setSignedIn(Boolean(await getAccess()));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!events) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: space.gutter, paddingBottom: 48 }}
      data={events}
      keyExtractor={(event) => event.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={palette.accent}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ marginBottom: 20 }}>
          <Text style={display(palette, type.h1)}>This week&apos;s tables.</Text>
          <Text style={[body(palette, type.small), { color: palette.inkSoft, marginTop: 8 }]}>
            Prices cover curation and your host — food goes straight to the restaurant.
          </Text>
        </View>
      }
      renderItem={({ item }) => <Row event={item} palette={palette} />}
      ListEmptyComponent={
        <Text style={[body(palette), { color: palette.inkSoft }]}>
          No tables listed yet. Pull to refresh.
        </Text>
      }
      ListFooterComponent={
        <View style={{ marginTop: 32, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 20 }}>
          {signedIn ? (
            <>
              <Link href="/you" asChild>
                <Pressable style={{ paddingVertical: 12 }}>
                  <Text style={[label(palette), { color: palette.ink }]}>Your seats & profile →</Text>
                </Pressable>
              </Link>
              <Pressable
                style={{ paddingVertical: 12 }}
                onPress={async () => {
                  await clearSession();
                  router.replace("/");
                }}
              >
                <Text style={label(palette)}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <Link href="/login" asChild>
              <Pressable style={{ backgroundColor: palette.ink, paddingVertical: 16, alignItems: "center" }}>
                <Text style={[label(palette), { color: palette.paper }]}>Sign in to book</Text>
              </Pressable>
            </Link>
          )}
        </View>
      }
    />
  );
}
