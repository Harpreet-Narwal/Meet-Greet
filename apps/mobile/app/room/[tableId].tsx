import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Empty, PrimaryButton, Section } from "../../components/ios";
import { useGameSocket, type GameState } from "../../lib/use-game-socket";
import {
  body,
  display,
  fonts,
  haptics,
  label,
  radius,
  space,
  type,
  usePalette,
} from "../../lib/theme";

const GAMES: { kind: GameState["kind"]; label: string; emoji: string }[] = [
  { kind: "icebreaker", label: "Ice-breakers", emoji: "🃏" },
  { kind: "hot_takes", label: "Hot Takes", emoji: "🌶️" },
  { kind: "most_likely", label: "Most Likely To", emoji: "👀" },
  { kind: "trivia", label: "Desi Trivia", emoji: "🧠" },
  { kind: "two_truths", label: "Two Truths", emoji: "🕵️" },
];

/**
 * The game room, for the table you're sitting at right now.
 *
 * The server drives the state machine and every client renders whatever
 * `room:state` last said, so six phones and laptops stay on the same card. No
 * optimistic updates: a device that guessed would show a different question from
 * the rest of the table, which is worse than a moment's latency.
 */
export default function GameRoom() {
  const palette = usePalette();
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const { connected, state, error, emit } = useGameSocket(tableId ?? null);
  const [answer, setAnswer] = useState("");

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, paddingHorizontal: space.gutter }}>
        <Empty title="Can't join the table." note={error} />
      </View>
    );
  }

  if (!state) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, paddingHorizontal: space.gutter }}>
        <Empty
          title={connected ? "Finding your table…" : "Connecting…"}
          note="The room opens once you're checked in at the venue."
        />
      </View>
    );
  }

  const card = state.cards[state.cardIndex];
  const isVoting = state.phase === "voting";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 48 }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: space.gap,
        }}
      >
        <Text style={label(palette)}>
          {connected ? `${state.players.length} at the table` : "Reconnecting…"}
        </Text>
        <Text style={[label(palette), { color: palette.inkMuted }]}>Level {state.level}</Text>
      </View>

      {state.phase === "lobby" ? (
        <View>
          <Text style={[display(palette, type.h1), { marginTop: 12 }]}>
            What are we playing?
          </Text>
          <Text style={[body(palette, type.small), { color: palette.inkMuted, marginTop: 8 }]}>
            Anyone can start. Everyone's phone follows along.
          </Text>
          <View style={{ marginTop: space.sectionSm, gap: 10 }}>
            {GAMES.map((game) => (
              <Pressable
                key={game.kind}
                testID={`start-${game.kind}`}
                onPress={() => {
                  haptics.commit();
                  emit("game:start", { deck_kind: game.kind, level: 1 });
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderWidth: 1,
                  borderColor: palette.line,
                  backgroundColor: palette.surface,
                  borderRadius: radius.control,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 22 }}>{game.emoji}</Text>
                <Text style={[body(palette), { color: palette.ink }]}>{game.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {state.phase === "ended" ? (
        <View>
          <Text style={[display(palette, type.h1), { marginTop: 12 }]}>That's a wrap.</Text>
          <Text style={[body(palette), { color: palette.inkSoft, marginTop: 8 }]}>
            Put the phones down and finish your food.
          </Text>
          <View style={{ marginTop: space.sectionSm }}>
            <PrimaryButton
              title="One more round"
              onPress={() => emit("game:start", { deck_kind: "hot_takes" })}
            />
          </View>
        </View>
      ) : null}

      {state.phase !== "lobby" && state.phase !== "ended" && card ? (
        <View>
          <Text style={[label(palette), { marginTop: 16 }]}>
            Card {state.cardIndex + 1} of {state.cards.length}
          </Text>
          <View
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.surface,
              borderRadius: radius.group,
              padding: 20,
            }}
          >
            <Text style={[display(palette, type.h2)]}>{card.text}</Text>
          </View>

          {state.kind === "hot_takes" && isVoting ? (
            <View style={{ flexDirection: "row", gap: 10, marginTop: space.sectionSm }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Agree" onPress={() => emit("vote:cast", { choice: "agree" })} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Disagree"
                  tone="accent"
                  onPress={() => emit("vote:cast", { choice: "disagree" })}
                />
              </View>
            </View>
          ) : null}

          {(state.kind === "most_likely" || state.kind === "two_truths") && isVoting ? (
            <Section title="Who's it going to be?">
              {state.players.map((player, index) => (
                <Pressable
                  key={player.user_id}
                  onPress={() => {
                    haptics.select();
                    emit("vote:cast", { choice: player.user_id });
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: pressed ? palette.band : "transparent",
                    borderBottomWidth: index === state.players.length - 1 ? 0 : 1,
                    borderBottomColor: palette.line,
                  })}
                >
                  <Text style={[body(palette), { color: palette.ink }]}>{player.first_name}</Text>
                </Pressable>
              ))}
            </Section>
          ) : null}

          {state.kind === "trivia" && state.phase === "card" ? (
            <View style={{ marginTop: space.sectionSm, gap: 10 }}>
              <TextInput
                value={answer}
                onChangeText={setAnswer}
                placeholder="Your answer"
                placeholderTextColor={palette.inkMuted}
                style={{
                  borderWidth: 1,
                  borderColor: palette.line,
                  backgroundColor: palette.surface,
                  borderRadius: radius.control,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: palette.ink,
                  fontFamily: fonts.body,
                  fontSize: type.body,
                }}
              />
              <PrimaryButton
                title="Lock it in"
                disabled={!answer.trim()}
                onPress={() => {
                  emit("card:answer", { answer: answer.trim() });
                  setAnswer("");
                }}
              />
            </View>
          ) : null}

          {state.phase === "reveal" ? (
            <View style={{ marginTop: space.sectionSm }}>
              {card.answer ? (
                <Text style={[body(palette), { color: palette.inkSoft, marginBottom: 12 }]}>
                  Answer: {card.answer}
                </Text>
              ) : null}
              <PrimaryButton title="Next card" onPress={() => emit("card:advance")} />
            </View>
          ) : null}

          <View style={{ marginTop: space.section }}>
            <Pressable onPress={() => emit("game:end")} style={{ paddingVertical: 12 }}>
              <Text style={[label(palette), { textAlign: "center" }]}>End the game</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
