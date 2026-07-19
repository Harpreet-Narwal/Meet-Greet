import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Instagram-story-sized (1080×1920) archetype share card.
 * Satori can't read CSS custom properties, so brand hex values are inlined
 * here — single sanctioned exception to the tokens-only rule (see PROGRESS.md).
 */
const PAPER = "#f9f9f6";
const INK = "#231f20";
const INK_SOFT = "#6c6766";
const ORANGE = "#ff832c";
const CORAL = "#ff847e";

const ARCHETYPES: Record<string, string> = {
  "Warm Firecracker": "You light up rooms AND go deep. Dangerous combination. Tables fight over you.",
  "Social Alchemist": "You turn six strangers into a group chat. It's basically a superpower.",
  "Playful Spark": "You keep it light, keep it fun, and somehow know everyone's name by round two.",
  "Cozy Philosopher": "Quiet until the conversation gets real — then nobody can keep up with you.",
  "Curious Wanderer": "You ask the questions nobody expects and order the dish nobody can pronounce.",
  "Steady Anchor": "Every great table needs one person holding it together. Hi, it's you.",
  "Gentle Rebel": "Low-key on the surface, plot twist underneath. People underestimate you exactly once.",
  "Quiet Observer": "You notice everything, say the perfect thing at the perfect time, and win the whole table.",
};

function mark(size: number) {
  const dot = size * 0.13;
  const orbit = size * 0.36;
  const positions = [0, 60, 120, 180, 240, 300].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: size / 2 + orbit * Math.sin(rad) - dot,
      y: size / 2 - orbit * Math.cos(rad) - dot,
      you: deg === 0,
    };
  });
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          left: size / 2 - size * 0.17,
          top: size / 2 - size * 0.17,
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: 9999,
          background: ORANGE,
        }}
      />
      {positions.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: dot * 2,
            height: dot * 2,
            borderRadius: 9999,
            background: p.you ? CORAL : INK,
          }}
        />
      ))}
    </div>
  );
}

export function GET(request: NextRequest): ImageResponse {
  const params = request.nextUrl.searchParams;
  const rawArchetype = params.get("archetype") ?? "Quiet Observer";
  const archetype = rawArchetype in ARCHETYPES ? rawArchetype : "Quiet Observer";
  const emoji = (params.get("emoji") ?? "🌙").slice(0, 8);
  const name = (params.get("name") ?? "").slice(0, 24);
  const blurb = ARCHETYPES[archetype];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: PAPER,
          color: INK,
          padding: "140px 96px 120px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 44, color: INK_SOFT, letterSpacing: 2 }}>
            {name ? `${name} is a` : "I'm a"}
          </div>
          <div style={{ display: "flex", fontSize: 160, marginTop: 30 }}>{emoji}</div>
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 700,
              color: ORANGE,
              marginTop: 24,
              textAlign: "center",
              letterSpacing: -3,
            }}
          >
            {archetype}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 44,
              lineHeight: 1.5,
              color: INK,
              marginTop: 48,
              textAlign: "center",
              maxWidth: 820,
            }}
          >
            {blurb}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          {mark(180)}
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
            mulaqat
          </div>
          <div style={{ display: "flex", fontSize: 30, color: INK_SOFT }}>
            dinner with six strangers, chosen for you
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
