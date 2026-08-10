import { useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Loading } from "../../components/ios";
import { api } from "../../lib/api";
import {
  body,
  fonts,
  haptics,
  label,
  radius,
  space,
  type,
  usePalette,
  type Palette,
} from "../../lib/theme";

interface Message {
  id: string;
  body: string;
  kind: string;
  sender_id: string;
  sender_name: string | null;
  created_at: string;
}

interface Me {
  user: { id: string };
}

function timeOf(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/**
 * A message thread.
 *
 * Bubbles rather than a transcript, because a group chat where you cannot tell
 * at a glance which side spoke is unreadable. Mine sit right on the ink fill;
 * everyone else's sit left on the surface with their name above, shown only
 * when the speaker changes — repeating it on every consecutive line is noise.
 */
function Bubble({
  message,
  mine,
  showName,
  palette,
}: {
  message: Message;
  mine: boolean;
  showName: boolean;
  palette: Palette;
}) {
  return (
    <View style={{ marginTop: showName ? 14 : 4, alignItems: mine ? "flex-end" : "flex-start" }}>
      {showName && !mine ? (
        <Text style={[label(palette), { marginBottom: 4, marginLeft: 12 }]}>
          {message.sender_name ?? "Someone"}
        </Text>
      ) : null}
      <View
        style={{
          maxWidth: "82%",
          backgroundColor: mine ? palette.ink : palette.surface,
          borderWidth: mine ? 0 : 1,
          borderColor: palette.line,
          borderRadius: radius.bubble,
          // The classic iMessage tail-corner: square off the corner nearest the
          // speaker so the bubble points at its owner.
          borderBottomRightRadius: mine ? 6 : radius.bubble,
          borderBottomLeftRadius: mine ? radius.bubble : 6,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text style={[body(palette), { color: mine ? palette.paper : palette.ink }]}>
          {message.body}
        </Text>
      </View>
      <Text style={[label(palette), { marginTop: 3, marginHorizontal: 8, fontSize: 10 }]}>
        {timeOf(message.created_at)}
      </Text>
    </View>
  );
}

export default function ChatThread() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState<string>("");
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    const [thread, me, chats] = await Promise.all([
      api<Message[]>(`/chats/${id}/messages`),
      api<Me>("/me"),
      api<{ id: string; title: string }[]>("/chats"),
    ]);
    setMessages(thread.data ?? []);
    setMeId(me.data?.user.id ?? null);
    setTitle(chats.data?.find((c) => c.id === id)?.title ?? "Chat");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const result = await api<Message>(`/chats/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    });
    setSending(false);
    if (!result.ok || !result.data) {
      haptics.warn();
      return;
    }
    haptics.select();
    setDraft("");
    setMessages((current) => [...(current ?? []), result.data as Message]);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }

  if (!messages) return <Loading />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.paper }}
      // The composer has to ride the keyboard. Without this it is buried the
      // moment you tap the field — the single most website-ish failure a chat
      // screen can have.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingVertical: 16 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardDismissMode="interactive"
        renderItem={({ item, index }) => {
          const previous = messages[index - 1];
          return (
            <Bubble
              message={item}
              mine={item.sender_id === meId}
              showName={previous?.sender_id !== item.sender_id}
              palette={palette}
            />
          );
        }}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 10,
          paddingHorizontal: space.gutter,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopWidth: 1,
          borderTopColor: palette.line,
          backgroundColor: palette.paper,
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Say something"
          placeholderTextColor={palette.inkMuted}
          multiline
          style={{
            flex: 1,
            maxHeight: 120,
            minHeight: 42,
            borderWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surface,
            borderRadius: radius.bubble,
            paddingHorizontal: 14,
            paddingTop: 11,
            paddingBottom: 11,
            color: palette.ink,
            fontFamily: fonts.body,
            fontSize: type.body,
          }}
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.ink,
            opacity: !draft.trim() || sending ? 0.4 : pressed ? 0.8 : 1,
          })}
        >
          {/* An upward chevron, drawn — one glyph is not worth an icon font. */}
          <View
            style={{
              width: 10,
              height: 10,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: palette.paper,
              transform: [{ rotate: "45deg" }],
              marginTop: 3,
            }}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
