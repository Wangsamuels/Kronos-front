import type { CSSProperties } from "react";

/**
 * Hero background: the 12-column drawing-sheet lanes, with thin light streaks falling down them
 * like rain on glass. Pure CSS (transform + opacity only), deterministic values so SSR and
 * hydration match, no JS at runtime. Odd lanes are hidden below md so phones get half the drops.
 * Reduced motion keeps the static lanes and drops the streaks.
 */
type Drop = { lane: number; dur: number; delay: number; len: number; tone?: "pass" };

// Hand-tuned so neighbouring lanes never fall in sync. dur/delay in seconds, len in px.
const DROPS: Drop[] = [
  { lane: 1, dur: 7.4, delay: -1.2, len: 120 },
  { lane: 2, dur: 9.8, delay: -6.1, len: 180 },
  { lane: 2, dur: 9.8, delay: -1.3, len: 90 },
  { lane: 3, dur: 6.2, delay: -3.4, len: 70 },
  { lane: 4, dur: 11.5, delay: -8.2, len: 220, tone: "pass" },
  { lane: 5, dur: 8.1, delay: -0.4, len: 110 },
  { lane: 6, dur: 10.6, delay: -4.9, len: 160 },
  { lane: 6, dur: 10.6, delay: -10.0, len: 80 },
  { lane: 7, dur: 6.9, delay: -5.6, len: 95 },
  { lane: 8, dur: 12.4, delay: -2.7, len: 200 },
  { lane: 9, dur: 7.8, delay: -7.1, len: 130, tone: "pass" },
  { lane: 10, dur: 9.1, delay: -3.9, len: 150 },
  { lane: 10, dur: 9.1, delay: -8.4, len: 60 },
  { lane: 11, dur: 8.6, delay: -6.6, len: 105 },
];

const LANES = Array.from({ length: 11 }, (_, i) => i + 1);

export function HeroRain() {
  return (
    <div aria-hidden className="k-rain pointer-events-none absolute inset-0 overflow-hidden">
      {LANES.map((l) => (
        <span key={l} className={l % 2 ? "k-rain-lane hidden md:block" : "k-rain-lane"} style={{ left: `${(l / 12) * 100}%` }} />
      ))}
      {DROPS.map((d, i) => (
        <span
          key={i}
          className={d.lane % 2 ? "k-rain-drop hidden md:block" : "k-rain-drop"}
          style={
            {
              left: `${(d.lane / 12) * 100}%`,
              "--dur": `${d.dur}s`,
              "--delay": `${d.delay}s`,
              "--len": `${d.len}px`,
              "--tone": d.tone === "pass" ? "var(--pass)" : "var(--text)",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
