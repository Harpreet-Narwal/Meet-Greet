import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { api, apiPublic, setSession } from "../lib/api";
import { body, display, haptics, label, space, type, usePalette } from "../lib/theme";

/** Phone → OTP, the same two-step the web uses. Dev accepts 000000. */
export default function Login() {
  const palette = usePalette();
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const e164 = `+91${phone.replace(/\D/g, "").slice(-10)}`;

  async function requestCode() {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("That needs to be a 10-digit number.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await apiPublic("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone: e164 }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't send the code.");
      return;
    }
    setStep("code");
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const result = await apiPublic<{ access_token: string; refresh_token: string }>(
      "/auth/otp/verify",
      { method: "POST", body: JSON.stringify({ phone: e164, code }) },
    );
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(result.message ?? "That code didn't work.");
      return;
    }
    await setSession(result.data.access_token, result.data.refresh_token);
    haptics.success();

    /*
     * Where a verified number lands.
     *
     * A brand-new account has no name, no email and no personality profile, so
     * sending it straight into the tabs is what made signing in feel like
     * nothing happened — and left matching with no traits to work with. Anyone
     * missing the profile goes to onboarding instead; returning users go back
     * to whatever they were doing.
     *
     * `/me` is the authority rather than a local flag, so reinstalling the app
     * or signing in on a second device does not re-ask someone who has already
     * answered.
     */
    const me = await api<{
      user: { first_name: string | null; email: string | null };
      personality: unknown | null;
    }>("/me");
    const needsOnboarding =
      !me.data?.personality || !me.data.user.first_name || !me.data.user.email;

    if (needsOnboarding) router.replace("/onboarding");
    else if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  const input = {
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Newsreader_400Regular",
    fontSize: type.body,
    color: palette.ink,
    marginTop: 8,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: space.gutter }}>
        <Text style={[display(palette, type.h1), { marginTop: 12 }]}>Pull up a chair.</Text>
        <Text style={[body(palette), { color: palette.inkSoft, marginTop: 8 }]}>
          Sign in with your phone — no passwords, no fuss.
        </Text>

        {step === "phone" ? (
          <View style={{ marginTop: 28 }}>
            <Text style={label(palette)}>Phone number</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[body(palette), { marginTop: 8 }]}>+91</Text>
              <TextInput
                style={[input, { flex: 1 }]}
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={12}
                placeholder="98765 43210"
                placeholderTextColor={palette.inkMuted}
                value={phone}
                onChangeText={setPhone}
                testID="phone-input"
              />
            </View>
            <Pressable
              onPress={requestCode}
              disabled={busy}
              style={{
                backgroundColor: palette.ink,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 20,
                opacity: busy ? 0.5 : 1,
              }}
              testID="request-otp"
            >
              <Text style={[label(palette), { color: palette.paper }]}>
                {busy ? "Sending…" : "Send me a code"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 28 }}>
            <Text style={label(palette)}>The 6-digit code we sent to {e164}</Text>
            <TextInput
              style={input}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={palette.inkMuted}
              value={code}
              onChangeText={setCode}
              testID="otp-input"
            />
            <Pressable
              onPress={verify}
              disabled={busy}
              style={{
                backgroundColor: palette.ink,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 20,
                opacity: busy ? 0.5 : 1,
              }}
              testID="verify-otp"
            >
              <Text style={[label(palette), { color: palette.paper }]}>
                {busy ? "Checking…" : "Let me in"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setStep("phone")} style={{ marginTop: 16 }}>
              <Text style={label(palette)}>← Different number?</Text>
            </Pressable>
            <Text style={[body(palette, type.small), { color: palette.inkSoft, marginTop: 20 }]}>
              Dev build: 000000 always works.
            </Text>
          </View>
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
    </KeyboardAvoidingView>
  );
}
