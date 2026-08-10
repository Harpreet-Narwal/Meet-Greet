import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Loading, PrimaryButton, Section } from "../components/ios";
import { api } from "../lib/api";
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
} from "../lib/theme";

interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
}
interface QuizQuestion {
  id: string;
  ord: number;
  kind: "single" | "multi" | "slider" | "either_or";
  text: string;
  subtext: string | null;
  options: QuizOption[];
}
interface Quiz {
  version: string;
  questions: QuizQuestion[];
}

type Answer =
  | { kind: "single" | "either_or"; question_id: string; option_id: string }
  | { kind: "multi"; question_id: string; option_ids: string[] }
  | { kind: "slider"; question_id: string; value: number };

/**
 * First-run onboarding.
 *
 * Signing in with a new number used to drop you straight into the app having
 * been asked nothing — so matching had no traits to work with and "You" showed
 * an empty profile. This is the missing step.
 *
 * One question per screen rather than a scrolling form: it is the pattern every
 * iOS onboarding uses, it keeps each answer a single thumb tap, and progress is
 * legible. The name/email step comes first because the confirmation and
 * reminder mails have nowhere to go without an address.
 */
export default function Onboarding() {
  const palette = usePalette();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await api<Quiz>("/quiz");
      setQuiz(result.data);
    })();
  }, []);

  if (!quiz) return <Loading />;

  // Step 0 is the profile; the quiz questions follow.
  const totalSteps = quiz.questions.length + 1;
  const question = step > 0 ? quiz.questions[step - 1] : null;
  const answered = question ? answers[question.id] : undefined;

  const canAdvance =
    step === 0
      ? firstName.trim().length > 0 && /\S+@\S+\.\S+/.test(email)
      : question?.kind === "slider"
        ? true // a slider always has a value; its default is a real answer
        : answered !== undefined;

  function choose(q: QuizQuestion, option: QuizOption) {
    haptics.select();
    setAnswers((current) => {
      if (q.kind === "multi") {
        const existing = current[q.id];
        const ids =
          existing && existing.kind === "multi" ? new Set(existing.option_ids) : new Set<string>();
        if (ids.has(option.id)) ids.delete(option.id);
        else ids.add(option.id);
        if (ids.size === 0) {
          const { [q.id]: _removed, ...rest } = current;
          return rest;
        }
        return { ...current, [q.id]: { kind: "multi", question_id: q.id, option_ids: [...ids] } };
      }
      return {
        ...current,
        [q.id]: {
          kind: q.kind === "either_or" ? "either_or" : "single",
          question_id: q.id,
          option_id: option.id,
        },
      };
    });
  }

  function isChosen(q: QuizQuestion, optionId: string): boolean {
    const current = answers[q.id];
    if (!current) return false;
    if (current.kind === "multi") return current.option_ids.includes(optionId);
    if (current.kind === "slider") return false;
    return current.option_id === optionId;
  }

  async function next() {
    setError(null);
    if (step === 0) {
      setBusy(true);
      const saved = await api("/me", {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName.trim(), email: email.trim() }),
      });
      setBusy(false);
      if (!saved.ok) {
        haptics.warn();
        setError(saved.message ?? "That didn't save — try again.");
        return;
      }
      setStep(1);
      return;
    }

    if (step < totalSteps - 1) {
      setStep(step + 1);
      return;
    }

    // Last question — submit and let the api score it. Captured locally
    // because the render-time null check does not narrow inside this closure.
    const active = quiz;
    if (!active) return;

    setBusy(true);
    const payload = active.questions
      .map((q) =>
        answers[q.id] ??
        (q.kind === "slider" ? { kind: "slider" as const, question_id: q.id, value: 0 } : null),
      )
      .filter((a): a is Answer => a !== null);

    const result = await api("/quiz/responses", {
      method: "POST",
      body: JSON.stringify({ quiz_version: active.version, answers: payload }),
    });
    setBusy(false);
    if (!result.ok) {
      haptics.warn();
      setError(result.message ?? "We couldn't save those answers.");
      return;
    }
    haptics.success();
    router.replace("/(tabs)/you");
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.paper }}
      contentContainerStyle={{ padding: space.gutter, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress as a bar, not "3 of 16" — the proportion is what people read. */}
      <View style={{ height: 3, backgroundColor: palette.line, borderRadius: 2 }}>
        <View
          style={{
            height: 3,
            width: `${((step + 1) / totalSteps) * 100}%`,
            backgroundColor: palette.accent,
            borderRadius: 2,
          }}
        />
      </View>

      {step === 0 ? (
        <View>
          <Text style={[display(palette, type.h1), { marginTop: space.sectionSm }]}>
            First, the basics.
          </Text>
          <Text style={[body(palette), { color: palette.inkSoft, marginTop: 10 }]}>
            Your table needs a name to expect, and somewhere to send the details.
          </Text>

          <Section title="Your name">
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="What should we call you?"
              placeholderTextColor={palette.inkMuted}
              autoCapitalize="words"
              autoComplete="given-name"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: palette.ink,
                fontFamily: fonts.body,
                fontSize: type.body,
              }}
            />
          </Section>

          <Section
            title="Email"
            footer="Booking confirmations and a nudge two hours before your table. Nothing else."
          >
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={palette.inkMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: palette.ink,
                fontFamily: fonts.body,
                fontSize: type.body,
              }}
            />
          </Section>
        </View>
      ) : question ? (
        <View>
          <Text style={[label(palette), { marginTop: space.sectionSm }]}>
            Question {step} of {quiz.questions.length}
          </Text>
          <Text style={[display(palette, type.h2), { marginTop: 8 }]}>{question.text}</Text>
          {question.subtext ? (
            <Text style={[body(palette, type.small), { color: palette.inkMuted, marginTop: 8 }]}>
              {question.subtext}
            </Text>
          ) : null}

          {question.kind === "slider" ? (
            <View style={{ marginTop: space.sectionSm }}>
              <Slider
                minimumValue={-1}
                maximumValue={1}
                step={0.1}
                value={answered?.kind === "slider" ? answered.value : 0}
                minimumTrackTintColor={palette.accent}
                maximumTrackTintColor={palette.line}
                onSlidingComplete={(value: number) => {
                  haptics.select();
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: { kind: "slider", question_id: question.id, value },
                  }));
                }}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={label(palette)}>{question.options[0]?.label ?? "Less"}</Text>
                <Text style={label(palette)}>{question.options[1]?.label ?? "More"}</Text>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: space.sectionSm, gap: 10 }}>
              {question.options.map((option) => {
                const chosen = isChosen(question, option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => choose(question, option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: chosen }}
                    style={({ pressed }) => ({
                      borderWidth: chosen ? 2 : 1,
                      borderColor: chosen ? palette.accent : palette.line,
                      backgroundColor: chosen ? palette.band : palette.surface,
                      borderRadius: radius.control,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                      opacity: pressed ? 0.85 : 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    })}
                  >
                    {option.emoji ? <Text style={{ fontSize: 20 }}>{option.emoji}</Text> : null}
                    <Text style={[body(palette), { flex: 1, color: palette.ink }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
              {question.kind === "multi" ? (
                <Text style={[label(palette), { marginTop: 2 }]}>Pick as many as fit</Text>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      {error ? (
        <Text
          accessibilityRole="alert"
          style={[body(palette, type.small), { color: palette.danger, marginTop: 16 }]}
        >
          {error}
        </Text>
      ) : null}

      <View style={{ marginTop: space.section }}>
        <PrimaryButton
          title={step === totalSteps - 1 ? "See my table personality" : "Next"}
          onPress={next}
          busy={busy}
          disabled={!canAdvance}
          testID="onboarding-next"
        />
      </View>
    </ScrollView>
  );
}
