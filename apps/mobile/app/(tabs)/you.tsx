import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";

import { Empty, Loading, PrimaryButton, Row, Section } from "../../components/ios";
import { api, clearSession, getAccess } from "../../lib/api";
import { pickAndUploadPhoto } from "../../lib/photo";
import { body, display, haptics, label, space, type, usePalette } from "../../lib/theme";

interface Me {
  user: {
    id: string;
    first_name: string | null;
    phone: string;
    email: string | null;
    gender: string | null;
    photo_url: string | null;
  };
  personality: { archetype: string; archetype_emoji: string } | null;
  counters: { events_attended: number; people_met: number };
}

interface BookingRow {
  id: string;
  status: string;
  amount_inr: number;
  event: { id: string; slug: string; title: string; starts_at: string };
}

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export default function You() {
  const palette = usePalette();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [seats, setSeats] = useState<BookingRow[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = useCallback(async () => {
    if (!(await getAccess())) {
      setSignedIn(false);
      return;
    }
    const [profile, bookings] = await Promise.all([
      api<Me>("/me"),
      api<{ upcoming: BookingRow[]; past: BookingRow[] }>("/me/bookings"),
    ]);
    setSignedIn(profile.status !== 401);
    setMe(profile.data);
    setSeats(bookings.data?.upcoming ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (signedIn === null) return <Loading />;

  if (!signedIn) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.paper }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: space.gutter }}
      >
        <Empty
          title="Pull up a chair."
          note="Sign in to book a seat, meet your table, and keep track of the nights you've said yes to."
        />
        <PrimaryButton title="Sign in" onPress={() => router.push("/login")} />
      </ScrollView>
    );
  }

  if (!me) return <Loading />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 40 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: space.gap }}>
        {/* Tap-to-change on the avatar itself, which is where people reach for
            it — no separate "edit photo" row. The OS crop sheet does the
            framing; see lib/photo.ts for why we don't ship our own cropper. */}
        <Pressable
          onPress={async () => {
            if (photoBusy) return;
            setPhotoBusy(true);
            const result = await pickAndUploadPhoto();
            setPhotoBusy(false);
            if (!result.ok) {
              haptics.warn();
              Alert.alert("Couldn't add that photo", result.message ?? "Try again.");
              return;
            }
            if (result.publicUrl) {
              haptics.success();
              await load();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Change your photo"
          style={({ pressed }) => ({ opacity: pressed || photoBusy ? 0.6 : 1 })}
        >
          {me.user.photo_url ? (
            <Image
              source={{ uri: me.user.photo_url }}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: palette.band }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: palette.band,
                borderWidth: 1,
                borderColor: palette.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[label(palette), { fontSize: 9 }]}>{photoBusy ? "···" : "Add"}</Text>
            </View>
          )}
        </Pressable>

        <Text style={[display(palette, type.h1), { flex: 1 }]}>
          {me.user.first_name ?? "Neighbour"}
        </Text>
      </View>
      <Text style={[body(palette, type.small), { color: palette.inkMuted, marginTop: 6 }]}>
        {me.counters.events_attended
          ? `${me.counters.events_attended} events · ${me.counters.people_met} people met`
          : seats.length > 0
            ? "Your first table is booked. Bring your appetite."
            : "Your first table is waiting."}
      </Text>

      {me.personality ? (
        <Section title="Table personality">
          <Row last>
            <Text style={[display(palette, type.h3)]}>
              {me.personality.archetype_emoji} {me.personality.archetype}
            </Text>
          </Row>
        </Section>
      ) : (
        <Section title="Table personality" footer="Five minutes, and your table stops being random.">
          <Row last onPress={() => router.push("/onboarding")}>
            <Text style={[body(palette), { color: palette.ink }]}>Take the quiz</Text>
          </Row>
        </Section>
      )}

      <Section title={`Your seats${seats.length ? ` · ${seats.length} upcoming` : ""}`}>
        {seats.length === 0 ? (
          <Row last>
            <Text style={[body(palette, type.small), { color: palette.inkMuted }]}>
              No seats booked yet — Wednesday and Saturday fill up first.
            </Text>
          </Row>
        ) : (
          seats.map((seat, index) => (
            <Row
              key={seat.id}
              last={index === seats.length - 1}
              onPress={() => router.push(`/event/${seat.event.slug}`)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={label(palette)}>{when(seat.event.starts_at)}</Text>
                <Text style={[label(palette), { color: palette.sage }]}>
                  {seat.status === "confirmed" ? "Paid" : seat.status.replace("_", " ")}
                </Text>
              </View>
              <Text style={[display(palette, type.h4), { marginTop: 4 }]}>{seat.event.title}</Text>
            </Row>
          ))
        )}
      </Section>

      <Section title="People" footer="Only from tables you actually sat at.">
        <Row last onPress={() => router.push("/people")}>
          <Text style={[body(palette), { color: palette.ink }]}>Who you've met</Text>
        </Row>
      </Section>

      <Section title="Account">
        <Row>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={[body(palette, type.small), { color: palette.inkSoft }]}>Phone</Text>
            <Text style={label(palette)}>{me.user.phone}</Text>
          </View>
        </Row>
        <Row last>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={[body(palette, type.small), { color: palette.inkSoft }]}>Email</Text>
            <Text style={label(palette)}>{me.user.email ?? "Not set"}</Text>
          </View>
        </Row>
      </Section>

      <View style={{ marginTop: space.section }}>
        <PrimaryButton
          title="Sign out"
          tone="accent"
          onPress={async () => {
            await clearSession();
            setSignedIn(false);
            setMe(null);
            setSeats([]);
          }}
        />
      </View>
    </ScrollView>
  );
}
