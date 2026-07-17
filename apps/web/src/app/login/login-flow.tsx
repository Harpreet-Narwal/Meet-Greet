"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, LogoMark } from "@mulaqat/ui";

import { postJson } from "@/lib/client";

/** "+91 98765 43210" | "9876543210" → E.164. Bare 10-digit numbers assume India. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return null;
}

export function LoginFlow() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      setError("That number doesn't look right — 10 digits, or full +country format.");
      return;
    }
    setBusy(true);
    const result = await postJson("/api/auth/request", { phone: normalized });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't send the code — give it another go.");
      return;
    }
    setPhone(normalized);
    setStep("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await postJson<{ is_new_user: boolean; has_personality: boolean }>(
      "/api/auth/verify",
      { phone, code },
    );
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(result.message ?? "That code didn't match — try again.");
      return;
    }
    router.push(result.data.has_personality ? "/you" : "/onboarding/quiz");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16">
      <Card large className="w-full max-w-md p-8 sm:p-10">
        <LogoMark size={36} className="text-ink" />
        <h1 className="mt-6 text-[28px] font-bold tracking-tight">Pull up a chair.</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Sign in with your phone — no passwords, no fuss.
        </p>

        {step === "phone" ? (
          <form onSubmit={requestCode} className="mt-8 flex flex-col gap-4">
            <label className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft" htmlFor="phone">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              placeholder="98765 43210"
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              className="h-12 rounded-card border border-line bg-paper px-4 text-[17px] outline-none transition-colors focus-visible:border-accent"
              data-testid="phone-input"
            />
            <Button type="submit" size="lg" disabled={busy} data-testid="request-otp">
              {busy ? "Sending…" : "Text me a code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-8 flex flex-col gap-4">
            <label className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft" htmlFor="code">
              The 6-digit code we sent to {phone}
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              placeholder="000000"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              className="h-12 rounded-card border border-line bg-paper px-4 text-center text-[22px] tracking-[0.4em] outline-none transition-colors focus-visible:border-accent"
              data-testid="otp-input"
            />
            <Button type="submit" size="lg" disabled={busy || code.length !== 6} data-testid="verify-otp">
              {busy ? "Checking…" : "Let me in"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              className="text-[14px] font-medium text-ink-soft underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Different number?
            </button>
            {process.env.NODE_ENV !== "production" ? (
              <p className="text-[13px] text-ink-soft">
                Dev build: <span className="font-mono font-semibold">000000</span> always works.
              </p>
            ) : null}
          </form>
        )}

        {error ? (
          <p role="alert" className="mt-4 text-[14px] font-medium text-danger">
            {error}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
