import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { Empty, Loading, Row, Section } from "../components/ios";
import { api } from "../lib/api";
import { body, display, label, space, type, usePalette } from "../lib/theme";

interface Connection {
  id: string;
  kind: "connect" | "spark";
  status: "pending" | "mutual";
  direction: "outgoing" | "mutual";
  person: { id: string; first_name: string | null; photo_url: string | null };
}

/**
 * People you met at a table.
 *
 * Reads `GET /me/connections`, which is already the privacy boundary: the query
 * returns only rows you sent or that are mutual, so someone else's one-sided
 * Spark toward you never reaches this device at all. That is deliberate and
 * load-bearing — the invariant is enforced server-side rather than by this
 * screen choosing what to hide, because a client-side filter is one refactor
 * away from leaking.
 *
 * So there is nothing here that says "someone sparked you". A pending Spark
 * shows only as *your* outgoing intent.
 */
export default function People() {
  const palette = usePalette();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[] | null>(null);

  const load = useCallback(async () => {
    const result = await api<Connection[]>("/me/connections");
    setConnections(result.data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!connections) return <Loading />;

  const mutual = connections.filter((c) => c.status === "mutual");
  const pending = connections.filter((c) => c.status === "pending");

  if (connections.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, paddingHorizontal: space.gutter }}>
        <Empty
          title="No one yet."
          note="After a table, you can keep in touch with the people you clicked with. Connections only happen between people who actually sat together."
        />
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: palette.paper, paddingHorizontal: space.gutter }}
    >
      {mutual.length > 0 ? (
        <Section title="Connected" footer="Say hello — the chat is already open.">
          {mutual.map((c, index) => (
            <Row
              key={c.id}
              last={index === mutual.length - 1}
              onPress={() => router.push("/(tabs)/chats")}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[display(palette, type.h4)]}>
                  {c.person.first_name ?? "Someone"}
                </Text>
                <Text style={[label(palette), { color: palette.accent2 }]}>
                  {c.kind === "spark" ? "Spark" : "Connected"}
                </Text>
              </View>
            </Row>
          ))}
        </Section>
      ) : null}

      {pending.length > 0 ? (
        <Section
          title="Sent"
          footer="We'll only tell them if they feel the same way. Nothing shows on their side until then."
        >
          {pending.map((c, index) => (
            <Row key={c.id} last={index === pending.length - 1}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[body(palette), { color: palette.ink }]}>
                  {c.person.first_name ?? "Someone"}
                </Text>
                <Text style={label(palette)}>Waiting</Text>
              </View>
            </Row>
          ))}
        </Section>
      ) : null}
    </View>
  );
}
