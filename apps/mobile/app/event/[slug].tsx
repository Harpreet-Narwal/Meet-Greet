import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { api, apiPublic, getAccess } from "../../lib/api";
import { body, display, label, space, type, usePalette } from "../../lib/theme";

interface EventDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  starts_at: string;
  duration_min: number;
  price_inr: number;
  seats_left: number;
  women_only: boolean;
  men_only: boolean;
  neighborhood_teaser: string | null;
  venue: { name: string; address: string; neighborhood: string } | null;
}

interface Booking {
  id: string;
  status: "confirmed" | "waitlisted" | "pending_payment";
}

export default function EventScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiPublic<EventDetail>(`/events/${slug}`);
    setEvent(result.data);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function book() {
    if (!event) return;
    if (!(await getAccess())) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await api<Booking>(`/events/${event.id}/bookings`, { method: "POST" });
    setBusy(false);
    if (!result.ok || !result.data) {
      // The gender-restricted-table refusals land here, and they are the most
      // useful thing the api says — surface them verbatim rather than a generic
      // "couldn't book".
      setError(result.message ?? "Couldn't hold that seat.");
      return;
    }
    setBooking(result.data);
    if (result.data.status === "waitlisted") {
      Alert.alert("You're on the waitlist", "We'll text you the moment a seat frees up.");
    }
  }

  async function pay() {
    if (!booking) return;
    setBusy(true);
    setError(null);
    const result = await api<Booking>(`/bookings/${booking.id}/pay`, { method: "POST" });
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(result.message ?? "The payment didn't go through — your seat is still held.");
      return;
    }
    setBooking(result.data);
    await load();
  }

  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const when = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(event.starts_at));

  const restriction = event.women_only ? "Women only" : event.men_only ? "Men only" : null;
  const primary = {
    backgroundColor: palette.ink,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginTop: 24,
    opacity: busy ? 0.5 : 1,
  };

  return (
    <ScrollView
      style={{ backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: space.gutter, paddingBottom: 48 }}
    >
      {restriction ? (
        <Text style={[label(palette), { color: palette.sage }]}>{restriction}</Text>
      ) : null}

      <Text style={[display(palette, type.h1), { marginTop: 8 }]}>{event.title}</Text>
      <Text style={[label(palette), { marginTop: 12 }]}>
        {when} IST · {event.duration_min} min
      </Text>
      <Text style={[body(palette), { color: palette.inkSoft, marginTop: 16 }]}>
        {event.description}
      </Text>

      <View style={{ borderTopWidth: 1, borderTopColor: palette.line, marginTop: 28, paddingTop: 20 }}>
        <Text style={[label(palette), { color: event.venue ? palette.sage : palette.accentInk }]}>
          {event.venue ? "Venue revealed" : "Venue revealed 24 hours before"}
        </Text>
        <Text style={[display(palette, type.h3), { marginTop: 8 }]}>
          {event.venue?.name ?? event.neighborhood_teaser ?? "Somewhere worth the auto ride"}
        </Text>
        {event.venue ? (
          <Text style={[body(palette, type.small), { color: palette.inkSoft, marginTop: 4 }]}>
            {event.venue.address}, {event.venue.neighborhood}
          </Text>
        ) : null}
      </View>

      {/* Booking → checkout → done, the same paywall the web enforces. */}
      {booking?.status === "pending_payment" ? (
        <View style={{ borderTopWidth: 1, borderTopColor: palette.line, marginTop: 28, paddingTop: 20 }}>
          <Text style={label(palette)}>Checkout · seat held for 15 minutes</Text>
          <Text style={[display(palette, type.h2), { marginTop: 8 }]}>Pay to lock the seat.</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
            <Text style={body(palette)}>Due now</Text>
            <Text style={[body(palette), { fontFamily: "JetBrainsMono_500Medium" }]}>
              ₹{event.price_inr}
            </Text>
          </View>
          <Pressable onPress={pay} disabled={busy} style={primary} testID="pay-booking">
            <Text style={[label(palette), { color: palette.paper }]}>
              {busy ? "Talking to the bank…" : `Pay ₹${event.price_inr}`}
            </Text>
          </Pressable>
          <Text style={[label(palette), { marginTop: 12 }]}>
            Dev build · mock provider — no real money moves
          </Text>
        </View>
      ) : booking ? (
        <View style={{ borderTopWidth: 1, borderTopColor: palette.line, marginTop: 28, paddingTop: 20 }}>
          <Text style={[label(palette), { color: palette.sage }]}>
            {booking.status === "waitlisted" ? "On the waitlist" : "Seat confirmed"}
          </Text>
          <Text style={[body(palette), { color: palette.inkSoft, marginTop: 8 }]}>
            {booking.status === "waitlisted"
              ? "We'll let you know the moment someone drops out."
              : "See you there. We'll send a reminder two hours before."}
          </Text>
        </View>
      ) : (
        <Pressable onPress={book} disabled={busy} style={primary} testID="book-cta">
          <Text style={[label(palette), { color: palette.paper }]}>
            {busy
              ? "Holding your seat…"
              : event.seats_left === 0
                ? "Join the waitlist"
                : event.price_inr === 0
                  ? "Take the seat"
                  : `Book a seat · ₹${event.price_inr}`}
          </Text>
        </Pressable>
      )}

      {error ? (
        <Text
          accessibilityRole="alert"
          style={[body(palette, type.small), { color: palette.danger, marginTop: 16 }]}
        >
          {error}
        </Text>
      ) : null}
    </ScrollView>
  );
}
