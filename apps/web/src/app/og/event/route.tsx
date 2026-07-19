import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Dynamic OG image for event pages (plan §8). 1200×630. Brand hex inlined —
 * satori can't read CSS custom properties (documented exception in PROGRESS.md).
 */
const PAPER = "#f9f9f6";
const INK = "#231f20";
const INK_SOFT = "#6c6766";
const ORANGE = "#ff832c";
const CORAL = "#ff847e";

const TYPE_LABEL: Record<string, string> = {
  dinner: "Dinner for Six",
  run_club: "Run Club",
  game_night: "Game Night",
  chai: "Chai & Chill",
  trek: "Trek",
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
  const title = (params.get("title") ?? "A Mulaqat table").slice(0, 80);
  const type = params.get("type") ?? "dinner";
  const when = (params.get("when") ?? "").slice(0, 40);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPER,
          color: INK,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, color: ORANGE, fontWeight: 700, letterSpacing: 1 }}>
              {(TYPE_LABEL[type] ?? "Mulaqat").toUpperCase()}
            </div>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 700, marginTop: 20, letterSpacing: -2, lineHeight: 1.05, maxWidth: 760 }}>
              {title}
            </div>
            {when ? (
              <div style={{ display: "flex", fontSize: 32, color: INK_SOFT, marginTop: 24 }}>{when} · Bengaluru</div>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {mark(64)}
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>mulaqat</div>
            <div style={{ display: "flex", fontSize: 24, color: INK_SOFT, marginLeft: 8 }}>
              six strangers, chosen for you
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
