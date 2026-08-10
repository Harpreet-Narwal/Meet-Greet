import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { api } from "../lib/api";
import { body, display, label, space, type, usePalette } from "../lib/theme";

interface Me {
  user: { first_name: string | null; phone: string; gender: string | null };
  personality: { archetype: string; archetype_emoji: string } | null;
  counters: { events_attended: number; people_met: number };
}

interface BookingRow {
  id: string;
  status: string;
  amount_inr: number;
  event: { id: string; title: string; starts_at: string };
}

export default function You() {
  const palette = usePalette();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [seats, setSeats] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [profile, bookings] = await Promise.all([
        api<Me>("/me"),
        api<{ upcoming: BookingRow[]; past: BookingRow[] }>("/me/bookings"),
      ]);
      if (profile.status === 401) {
        router.replace("/login");
        return;
      }
      setMe(profile.data);
      setSeats(bookings.data?.upcoming ?? []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: space.gutter, paddingBottom: 48 }}
    >
      <Text style={display(palette, type.h1)}>{me?.user.first_name ?? "Neighbour"}</Text>
      <Text style={[body(palette, type.small), { color: palette.inkSoft, marginTop: 6 }]}>
        {/* Three states, not two. Someone who has booked but not yet eaten has
            attended nothing, and telling them their first table is "waiting"
            directly above the seat they just paid for reads as if the booking
            did not register. */}
        {me?.counters.events_attended
          ? `${me.counters.events_attended} events · ${me.counters.people_met} people met`
          : seats.length > 0
            ? "Your first table is booked. Bring your appetite."
            : "Your first table is waiting."}
      </Text>

      {me?.personality ? (
        <View style={{ borderTopWidth: 1, borderTopColor: palette.line, marginTop: 28, paddingTop: 20 }}>
          <Text style={label(palette)}>Table personality</Text>
          <Text style={[display(palette, type.h3), { marginTop: 6 }]}>
            {me.personality.archetype_emoji} {me.personality.archetype}
          </Text>
        </View>
      ) : null}

      <View style={{ borderTopWidth: 1, borderTopColor: palette.line, marginTop: 28, paddingTop: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={display(palette, type.h2)}>Your seats</Text>
          <Text style={label(palette)}>{seats.length} upcoming</Text>
        </View>

        {seats.length === 0 ? (
          <Text style={[body(palette), { color: palette.inkSoft, marginTop: 12 }]}>
            No seats booked yet — Wednesday and Saturday fill up first.
          </Text>
        ) : (
          seats.map((seat) => {
            const paid = seat.status === "confirmed" || seat.status === "checked_in";
            return (
              <View
                key={seat.id}
                style={{ borderTopWidth: 1, borderTopColor: palette.line, paddingVertical: 16, marginTop: 16 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={label(palette)}>
                    {new Intl.DateTimeFormat("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Kolkata",
                    }).format(new Date(seat.event.starts_at))}{" "}
                    IST
                  </Text>
                  <Text style={[label(palette), { color: palette.ink }]}>
                    {seat.amount_inr === 0 ? "Free" : `₹${seat.amount_inr}`}
                  </Text>
                </View>
                <Text style={[display(palette, type.h3), { marginTop: 6 }]}>{seat.event.title}</Text>
                <Text style={[label(palette), { color: paid ? palette.sage : palette.accentInk, marginTop: 6 }]}>
                  {paid ? "Paid" : seat.status === "pending_payment" ? "Payment due" : seat.status}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
