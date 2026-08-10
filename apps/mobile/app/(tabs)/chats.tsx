import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";

import { Empty, Loading, Row, Section } from "../../components/ios";
import { api, getAccess } from "../../lib/api";
import { body, display, label, space, type, usePalette } from "../../lib/theme";

export interface ChatSummary {
  id: string;
  kind: string;
  title: string;
  members: { id: string; first_name: string | null; photo_url: string | null }[];
  last_message: string | null;
  expires_at: string | null;
  is_spark: boolean;
}

function expiryNote(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Closing today";
  return days === 1 ? "1 day left" : `${days} days left`;
}

export default function Chats() {
  const palette = usePalette();
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = await getAccess();
    setSignedIn(Boolean(token));
    if (!token) {
      setChats([]);
      return;
    }
    const result = await api<ChatSummary[]>("/chats");
    setChats(result.data ?? []);
  }, []);

  // Refetch on focus, not just on mount: booking a table opens its group chat,
  // and switching straight to this tab should show it rather than an empty list
  // held over from before.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (chats === null || signedIn === null) return <Loading />;

  if (!signedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, paddingHorizontal: space.gutter }}>
        <Empty
          title="Your tables talk here."
          note="Sign in to see the group chat for every table you've booked."
        />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: palette.paper }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 40 }}
      data={chats}
      keyExtractor={(chat) => chat.id}
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
      renderItem={({ item, index }) => {
        const expiry = expiryNote(item.expires_at);
        return (
          <Section style={{ marginTop: index === 0 ? space.gap : 12 }}>
            <Row last onPress={() => router.push(`/chat/${item.id}`)} accessibilityLabel={item.title}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={label(palette)}>
                  {item.is_spark ? "Spark" : `${item.members.length} at the table`}
                </Text>
                {expiry ? (
                  <Text style={[label(palette), { color: palette.inkMuted }]}>{expiry}</Text>
                ) : null}
              </View>
              <Text style={[display(palette, type.h4), { marginTop: 4 }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text
                style={[body(palette, type.small), { color: palette.inkMuted, marginTop: 2 }]}
                numberOfLines={1}
              >
                {item.last_message ?? "No messages yet — say hello."}
              </Text>
            </Row>
          </Section>
        );
      }}
      ListEmptyComponent={
        <Empty
          title="No chats yet."
          note="Book a table and its group chat opens here, so you can sort out the details before the night."
        />
      }
    />
  );
}
