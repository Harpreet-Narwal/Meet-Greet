"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, ButtonLink, Card, LogoMark } from "@mulaqat/ui";

import { postJson } from "@/lib/client";
import { formatINR } from "@/lib/format";

interface EventInput {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  price_inr: number;
  seats_left: number;
  women_only: boolean;
}

interface BookingResult {
  id: string;
  status: "confirmed" | "waitlisted" | "pending_payment";
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function BookingFlow({ event }: { event: EventInput }) {
  const router = useRouter();
  const [step, setStep] = useState<"review" | "two_truths" | "done">("review");
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [truth1, setTruth1] = useState("");
  const [truth2, setTruth2] = useState("");
  const [lie, setLie] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function book() {
    setBusy(true);
    setError(null);
    const result = await postJson<BookingResult>(`/api/bff/events/${event.id}/bookings`, {});
    setBusy(false);
    if (result.status === 401) {
      router.push(`/login?next=/events/${event.slug}/book`);
      return;
    }
    if (!result.ok || !result.data) {
      setError(result.message ?? "That didn't go through — try again.");
      return;
    }
    setBooking(result.data);
    setStep(result.data.status === "waitlisted" ? "done" : "two_truths");
  }

  async function submitTruths(eventForm: React.FormEvent) {
    eventForm.preventDefault();
    if (!booking) return;
    setBusy(true);
    setError(null);
    const result = await postJson(`/api/bff/bookings/${booking.id}/two-truths`, {
      truths: [truth1, truth2],
      lie,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't save those — try again.");
      return;
    }
    setStep("done");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16">
      <Card large className="w-full max-w-md p-8 sm:p-10">
        <LogoMark size={34} className="text-ink" />

        {step === "review" ? (
          <>
            <h1 className="mt-6 text-[26px] font-bold leading-tight tracking-tight">
              {event.title}
            </h1>
            <p className="mt-2 text-[15px] text-ink-soft">
              {dateFormatter.format(new Date(event.starts_at))} IST
            </p>
            <div className="mt-6 flex items-center justify-between rounded-card border border-line bg-paper px-5 py-4">
              <span className="text-[15px] font-medium">One seat at the table</span>
              <span className="text-[17px] font-bold">
                {event.price_inr === 0 ? "Free" : formatINR(event.price_inr)}
              </span>
            </div>
            {event.seats_left === 0 ? (
              <p className="mt-4 text-[14px] text-ink-soft">
                This table is full — you&apos;ll join the waitlist. Cancellations free up seats
                surprisingly often, and you only pay if you get in.
              </p>
            ) : null}
            <Button className="mt-7 w-full" size="lg" disabled={busy} onClick={book} data-testid="confirm-booking">
              {busy
                ? "Holding your seat…"
                : event.seats_left === 0
                  ? "Join the waitlist"
                  : event.price_inr === 0
                    ? "Take the seat"
                    : `Pay ${formatINR(event.price_inr)} & lock it`}
            </Button>
            <p className="mt-4 text-[13px] text-ink-soft">
              Cancel more than 48 hours before and the full amount comes back as credit.
            </p>
          </>
        ) : null}

        {step === "two_truths" ? (
          <form onSubmit={submitTruths} className="mt-6 flex flex-col gap-4">
            <Badge tone="sage" className="self-start">
              Seat locked
            </Badge>
            <h1 className="text-[24px] font-bold leading-tight tracking-tight">
              Two truths and a lie, please.
            </h1>
            <p className="text-[14px] leading-relaxed text-ink-soft">
              The table guesses your lie over dinner — the single best ice-breaker we know.
              Make the truths unbelievable and the lie boring.
            </p>
            <label className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft" htmlFor="truth-1">
              Truth one
            </label>
            <input id="truth-1" required minLength={3} maxLength={140} value={truth1}
              onChange={(e) => setTruth1(e.target.value)}
              placeholder="I've run a half marathon in Ladakh"
              className="h-12 rounded-card border border-line bg-paper px-4 text-[15px] outline-none focus-visible:border-accent"
              data-testid="truth-1" />
            <label className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft" htmlFor="truth-2">
              Truth two
            </label>
            <input id="truth-2" required minLength={3} maxLength={140} value={truth2}
              onChange={(e) => setTruth2(e.target.value)}
              placeholder="I make a genuinely great biryani"
              className="h-12 rounded-card border border-line bg-paper px-4 text-[15px] outline-none focus-visible:border-accent"
              data-testid="truth-2" />
            <label className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft" htmlFor="lie">
              The lie
            </label>
            <input id="lie" required minLength={3} maxLength={140} value={lie}
              onChange={(e) => setLie(e.target.value)}
              placeholder="I once met Rahul Dravid in an elevator"
              className="h-12 rounded-card border border-line bg-paper px-4 text-[15px] outline-none focus-visible:border-accent"
              data-testid="lie" />
            <Button type="submit" size="lg" disabled={busy} data-testid="submit-truths">
              {busy ? "Saving…" : "Seal them in"}
            </Button>
            <Link href="/tonight" className="text-center text-[14px] font-medium text-ink-soft underline-offset-4 hover:underline">
              I&apos;ll write these later
            </Link>
          </form>
        ) : null}

        {step === "done" ? (
          <div className="mt-6" data-testid="booking-done">
            {booking?.status === "waitlisted" ? (
              <>
                <Badge tone="neutral">On the waitlist</Badge>
                <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-tight">
                  You&apos;re in line.
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  If a seat opens up, it&apos;s yours automatically — we&apos;ll only charge you
                  then. Keep the evening free, just in case.
                </p>
              </>
            ) : (
              <>
                <Badge tone="sage">Confirmed</Badge>
                <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-tight">
                  Your table awaits.
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                  Venue drops 24 hours before. We&apos;ll introduce your table with first names
                  and one suspiciously interesting fact each.
                </p>
              </>
            )}
            <ButtonLink href="/tonight" size="lg" className="mt-7" data-testid="to-tonight">
              See what&apos;s next
            </ButtonLink>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-[14px] font-medium text-danger">
            {error}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
