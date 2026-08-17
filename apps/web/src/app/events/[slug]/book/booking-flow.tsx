"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, ButtonLink, Card, LogoMark } from "@mulaqat/ui";

import { BackLink } from "@/components/back-link";
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
  /** Set only when a real gateway is configured — see pay(). */
  checkout_url?: string | null;
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
  const [step, setStep] = useState<"review" | "checkout" | "two_truths" | "done">("review");
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
    // A paid seat comes back as pending_payment and is only held for 15 minutes,
    // so the next stop is checkout — not the table games.
    setStep(
      result.data.status === "waitlisted"
        ? "done"
        : result.data.status === "pending_payment"
          ? "checkout"
          : "two_truths",
    );
  }

  async function pay() {
    if (!booking) return;
    setBusy(true);
    setError(null);

    /*
     * Two checkout paths, chosen by what the api returned rather than by a build
     * flag. With a real gateway the booking carries `checkout_url` — a Razorpay
     * hosted page offering UPI, cards and netbanking — and the seat is confirmed
     * by the webhook, not by this navigation. So hand the browser over and let
     * the callback bring them back to /you.
     *
     * A full navigation, not a popup: blockers eat popups, and a checkout that
     * silently fails to open is worse than leaving the page.
     */
    if (booking.checkout_url) {
      window.location.href = booking.checkout_url;
      return;
    }

    const result = await postJson<BookingResult>(`/api/bff/bookings/${booking.id}/pay`, {});
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(result.message ?? "The payment didn't go through — your seat is still held.");
      return;
    }
    setBooking(result.data);
    setStep("two_truths");
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
        <BackLink href={`/events/${event.slug}`} label="Back to the table" className="mb-6" />
        <LogoMark size={34} className="text-ink" />

        {step === "review" ? (
          <>
            <h1 className="mt-6 text-h1">
              {event.title}
            </h1>
            <p className="mt-2 text-[15px] text-ink-soft">
              {dateFormatter.format(new Date(event.starts_at))} IST
            </p>
            <div className="mt-6 flex items-center justify-between rounded-card border border-line bg-paper px-5 py-4">
              <span className="text-[15px] font-medium">One seat at the table</span>
              <span className="text-[17px] font-medium">
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

        {step === "checkout" ? (
          <>
            <p className="label mt-6">Checkout · seat held for 15 minutes</p>
            <h1 className="mt-3 text-h1">Pay to lock the seat.</h1>
            <p className="measure mt-3 text-ink-soft">
              Your seat at {event.title} is held but not yours yet. Nothing is charged for the
              food — that goes straight to the restaurant on the night.
            </p>

            <dl className="mt-7 border-t border-line">
              <div className="flex items-baseline justify-between border-b border-line py-3.5">
                <dt className="text-ink-soft">Seat · booking fee</dt>
                <dd className="font-mono tabular-nums">{formatINR(event.price_inr)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-line py-3.5">
                <dt className="text-ink-soft">Food &amp; drinks</dt>
                <dd className="label">Pay at the venue</dd>
              </div>
              <div className="flex items-baseline justify-between py-3.5">
                <dt>Due now</dt>
                <dd className="font-mono text-h3 tabular-nums">{formatINR(event.price_inr)}</dd>
              </div>
            </dl>

            <Button
              className="mt-7 w-full"
              size="lg"
              disabled={busy}
              onClick={pay}
              data-testid="pay-booking"
            >
              {busy ? "Talking to the bank…" : `Pay ${formatINR(event.price_inr)}`}
            </Button>
            <p className="label mt-4">
              Dev build · mock provider — no real money moves
            </p>
            <p className="mt-3 text-small text-ink-soft">
              Leave this page and the seat is released back to the table after 15 minutes.
            </p>
          </>
        ) : null}

        {step === "two_truths" ? (
          <form onSubmit={submitTruths} className="mt-6 flex flex-col gap-4">
            <Badge tone="sage" className="self-start">
              Seat locked
            </Badge>
            <h1 className="text-h1">
              Two truths and a lie, please.
            </h1>
            <p className="text-[14px] leading-relaxed text-ink-soft">
              The table guesses your lie over dinner — the single best ice-breaker we know.
              Make the truths unbelievable and the lie boring.
            </p>
            <label className="text-[13px] font-medium uppercase tracking-wide text-ink-soft" htmlFor="truth-1">
              Truth one
            </label>
            <input id="truth-1" required minLength={3} maxLength={140} value={truth1}
              onChange={(e) => setTruth1(e.target.value)}
              placeholder="I've run a half marathon in Ladakh"
              className="h-12 rounded-card border border-line bg-paper px-4 text-[15px] outline-none focus-visible:border-accent"
              data-testid="truth-1" />
            <label className="text-[13px] font-medium uppercase tracking-wide text-ink-soft" htmlFor="truth-2">
              Truth two
            </label>
            <input id="truth-2" required minLength={3} maxLength={140} value={truth2}
              onChange={(e) => setTruth2(e.target.value)}
              placeholder="I make a genuinely great biryani"
              className="h-12 rounded-card border border-line bg-paper px-4 text-[15px] outline-none focus-visible:border-accent"
              data-testid="truth-2" />
            <label className="text-[13px] font-medium uppercase tracking-wide text-ink-soft" htmlFor="lie">
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
                <h1 className="mt-4 text-h1">
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
                <h1 className="mt-4 text-h1">
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
