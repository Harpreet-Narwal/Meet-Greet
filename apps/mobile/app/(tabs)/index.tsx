import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";

import { Empty, Loading, Row, Section } from "../../components/ios";
import { apiPublic } from "../../lib/api";
import { body, display, label, space, type, usePalette, type Palette } from "../../lib/theme";

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

function EventRow({
  event,
  palette,
  last,
  onPress,
}: {
  event: PublicEvent;
  palette: Palette;
  last: boolean;
  onPress: () => void;
}) {
  const soldOut = event.seats_left === 0;
  const almostFull = event.seats_left > 0 && event.seats_left <= 3;
  const restriction = event.women_only ? " · Women only" : event.men_only ? " · Men only" : "";

  return (
    <Row onPress={onPress} last={last} accessibilityLabel={event.title}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={label(palette)}>{formatWhen(event.starts_at)}</Text>
        <Text style={[label(palette), { color: palette.ink }]}>
          {event.price_inr === 0 ? "Free" : `₹${event.price_inr}`}
        </Text>
      </View>

      <Text style={[display(palette, type.h4), { marginTop: 4 }]} numberOfLines={2}>
        {event.title}
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <Text style={label(palette)}>
          {TYPE_LABELS[event.type] ?? event.type}
          {restriction}
        </Text>
        <Text
          style={[
            label(palette),
            almostFull ? { color: palette.accentInk } : soldOut ? { color: palette.inkMuted } : {},
          ]}
        >
          {soldOut ? "Waitlist" : `${event.seats_left} left`}
        </Text>
      </View>
    </Row>
  );
}

export default function Tables() {
  const palette = usePalette();
  const router = useRouter();
  const [events, setEvents] = useState<PublicEvent[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await apiPublic<PublicEvent[]>("/events?city=bangalore");
    setEvents(result.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!events) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: palette.paper }}
      // Lets the large title collapse against the scroll rather than sitting
      // on top of a separately-scrolling list.
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 40 }}
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
        <Text
          style={[body(palette, type.small), { color: palette.inkMuted, marginTop: space.gap }]}
        >
          Prices cover curation and your host — food goes straight to the restaurant.
        </Text>
      }
      renderItem={({ item, index }) => (
        <Section style={index === 0 ? { marginTop: space.gap } : { marginTop: 12 }}>
          <EventRow
            event={item}
            palette={palette}
            last
            onPress={() => router.push(`/event/${item.slug}`)}
          />
        </Section>
      )}
      ListEmptyComponent={
        <Empty title="No tables listed yet." note="Pull down to refresh — new nights go up on Mondays." />
      }
    />
  );
}
