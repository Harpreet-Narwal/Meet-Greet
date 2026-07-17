/**
 * The hero visual: the brand mark, alive. Six seats settle in around the
 * terracotta table one by one; the saffron seat — you — arrives last with a
 * soft glow. Geometry lifted from assets/icon.svg, animated in CSS only.
 */

const SEATS = [
  { cx: 205.94, cy: 83, delay: 0.15 },
  { cx: 205.94, cy: 173, delay: 0.3 },
  { cx: 128, cy: 218, delay: 0.45 },
  { cx: 50.06, cy: 173, delay: 0.6 },
  { cx: 50.06, cy: 83, delay: 0.75 },
];

const CHIPS = [
  { label: "chai loyalist", className: "top-[2%] right-[-4%] sm:right-[-10%]", delay: "1.7s" },
  { label: "loves standup", className: "bottom-[16%] left-[-6%] sm:left-[-14%]", delay: "1.9s" },
  { label: "trail runner", className: "bottom-[-2%] right-[4%]", delay: "2.1s" },
];

export function TableScene() {
  return (
    <div className="table-scene relative mx-auto w-[min(78vw,380px)]" aria-hidden="true">
      <svg viewBox="0 0 256 256" fill="none" className="w-full h-auto text-ink">
        {/* seating circle — binds the six seats */}
        <circle
          cx="128"
          cy="128"
          r="90"
          stroke="var(--line)"
          strokeWidth="1.5"
          strokeDasharray="3 7"
          strokeLinecap="round"
          className="orbit"
        />
        {/* the table */}
        <circle cx="128" cy="128" r="44" fill="var(--accent)" className="seat table-top" />
        {/* five strangers */}
        {SEATS.map((seat) => (
          <circle
            key={`${seat.cx}-${seat.cy}`}
            cx={seat.cx}
            cy={seat.cy}
            r="17"
            fill="currentColor"
            className="seat"
            style={{ animationDelay: `${seat.delay}s` }}
          />
        ))}
        {/* you — the spark */}
        <circle cx="128" cy="38" r="26" fill="var(--accent-2)" opacity="0.28" className="seat you-glow" style={{ animationDelay: "1.05s" }} />
        <circle cx="128" cy="38" r="17" fill="var(--accent-2)" className="seat" style={{ animationDelay: "1.05s" }} />
      </svg>

      {CHIPS.map((chip) => (
        <span
          key={chip.label}
          className={`table-chip absolute ${chip.className}`}
          style={{ animationDelay: chip.delay }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
