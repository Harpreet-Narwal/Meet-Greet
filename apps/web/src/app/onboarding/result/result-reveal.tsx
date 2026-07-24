"use client";

import { MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, ButtonLink, LogoMark } from "@mulaqat/ui";

import { getJson } from "@/lib/client";

interface Personality {
  traits: { energy: number; depth: number; novelty: number; structure: number };
  archetype: string;
  archetype_emoji: string;
}

interface Me {
  user: { first_name: string | null };
  personality: Personality | null;
}

const TRAIT_LABELS: [key: keyof Personality["traits"], low: string, high: string][] = [
  ["energy", "Quiet recharger", "Crowd charger"],
  ["depth", "Keeps it light", "Goes deep fast"],
  ["novelty", "Comfort zone", "Wildcard"],
  ["structure", "Spontaneous", "Planner"],
];

export function ResultReveal() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getJson<Me>("/api/bff/me");
      if (result.status === 401) return router.replace("/login");
      if (!result.data?.personality) return router.replace("/onboarding/quiz");
      setMe(result.data);
      setTimeout(() => setFlipped(true), 700);
    })();
  }, [router]);

  if (!me?.personality) {
    return (
      <main className="min-h-dvh grid place-items-center px-6">
        <div className="flex flex-col items-center gap-4 text-ink-soft">
          <LogoMark size={40} className="animate-pulse text-ink" />
          <p>Reading your vibe…</p>
        </div>
      </main>
    );
  }

  const personality = me.personality;
  const firstName = me.user.first_name ?? "";
  const ogUrl = `/og/archetype?${new URLSearchParams({
    name: firstName,
    archetype: personality.archetype,
    emoji: personality.archetype_emoji,
  }).toString()}`;

  async function share() {
    const url = `${window.location.origin}${ogUrl}`;
    if (navigator.share) {
      await navigator.share({
        title: `I'm a ${personality.archetype} ${personality.archetype_emoji}`,
        text: "Took the mulaqat quiz — this is apparently my table personality.",
        url,
      }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-14">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
        Your table personality
      </p>

      {/* card flip */}
      <div className="mt-6 w-full max-w-sm" style={{ perspective: 1200 }}>
        <motion.div
          initial={false}
          animate={{ rotateY: flipped ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative"
        >
          {/* front — the archetype card */}
          <div
            className="rounded-card-lg border border-line bg-surface p-8 text-center shadow-soft"
            style={{ backfaceVisibility: "hidden" }}
            data-testid="archetype-card"
          >
            <span className="text-[64px] leading-none" aria-hidden>
              {personality.archetype_emoji}
            </span>
            <h1 className="mt-4 text-[30px] font-bold leading-tight tracking-tight">
              {firstName ? `${firstName}, you're a` : "You're a"}
              <br />
              <span className="text-accent-ink">{personality.archetype}</span>
            </h1>

            <div className="mt-7 flex flex-col gap-3 text-left">
              {TRAIT_LABELS.map(([key, low, high]) => {
                const value = personality.traits[key];
                return (
                  <div key={key}>
                    <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                      <span>{low}</span>
                      <span>{high}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-ink/10">
                      <motion.div
                        className="h-full rounded-full bg-accent-2"
                        initial={{ width: "50%" }}
                        animate={{ width: `${((value + 1) / 2) * 100}%` }}
                        transition={{ delay: 1.1, type: "spring", stiffness: 120, damping: 20 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex items-center justify-center gap-2 text-[12px] text-ink-soft">
              <LogoMark size={16} className="text-ink" />
              <span>mulaqat</span>
            </div>
          </div>

          {/* back — face-down state */}
          <div
            className="absolute inset-0 grid place-items-center rounded-card-lg border border-line bg-accent shadow-soft"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            aria-hidden
          >
            <LogoMark size={72} className="text-on-accent" />
          </div>
        </motion.div>
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={share}>
          Share it
        </Button>
        <ButtonLink href={ogUrl} download variant="secondary" size="lg">
          Download for Stories
        </ButtonLink>
      </div>
      <ButtonLink href="/onboarding/photo" variant="ghost" size="md" className="mt-4" data-testid="to-photo">
        Next: put a face to the name
      </ButtonLink>
    </main>
    </MotionConfig>
  );
}
