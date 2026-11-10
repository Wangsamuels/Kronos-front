"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

const TIERS = [
  { tier: 0, delay: "instant", days: 0, what: "pause, lower caps (tighten)" },
  { tier: 1, delay: "48 hours", days: 2, what: "routine params" },
  { tier: 2, delay: "7 days", days: 7, what: "new collateral, oracle changes" },
  { tier: 3, delay: "14 days + co-sign", days: 14, what: "upgrades, guard and key changes" },
];

/** Scrubber over 14 days. The fake-collateral listing sits in the Tier 2 queue until cancelled. */
export function AdminTimeline() {
  const reduce = useReducedMotion();
  const [day, setDay] = useState(2.5);
  const [cancelled, setCancelled] = useState(false);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || reduce || cancelled) return;
    const t = setInterval(() => setDay((d) => (d >= 6.8 ? 0.5 : +(d + 0.1).toFixed(1))), 120);
    return () => clearInterval(t);
  }, [playing, reduce, cancelled]);
  const left = Math.max(0, 7 - day);
  return (
    <div className="k-panel p-5">
      <div className="grid gap-px overflow-hidden rounded-ctl border border-line bg-line md:grid-cols-4">
        {TIERS.map((t) => (
          <div key={t.tier} className="bg-surface p-4">
            <p className="font-mono text-13 text-text">Tier {t.tier}</p>
            <p className={cn("mt-1 font-mono text-13", t.tier === 0 ? "text-pass" : "text-queue")}>{t.delay}</p>
            <p className="mt-2 text-13 text-text-2">{t.what}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="relative h-10">
          <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
          {[0, 2, 7, 14].map((d) => (
            <span key={d} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-11 text-text-3" style={{ left: `${(d / 14) * 100}%` }}>
              <span className="block h-3 w-px bg-text-3" />
              <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap">{d}d</span>
            </span>
          ))}
          <span className="absolute top-1/2 block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text" style={{ left: `${(day / 14) * 100}%` }} />
        </div>
        <label className="mt-6 flex items-center gap-3">
          <span className="k-label">scrub</span>
          <input
            type="range"
            min={0}
            max={14}
            step={0.1}
            value={day}
            onChange={(e) => {
              setPlaying(false);
              setDay(Number(e.target.value));
            }}
            className="h-11 flex-1 accent-[rgb(var(--text))]"
            aria-valuetext={`day ${day}`}
          />
        </label>
      </div>
      <div className={cn("mt-4 flex flex-wrap items-center justify-between gap-3 rounded-ctl border px-4 py-3", cancelled ? "border-block/60 bg-block/5" : "border-queue/50 bg-queue/5")}>
        <div className="font-mono text-13">
          <p className={cancelled ? "text-block line-through" : "text-text"}>listCollateral(FAKE, ownOracle, 75%)</p>
          <p className="mt-1 text-text-3">
            {cancelled ? "cancelled by guardian · never executed" : day >= 7 ? "delay elapsed · executes only if simulate-then-check passes" : `tier 2 · executes in ${left.toFixed(1)} days · proposer 0x6b11…c3e2`}
          </p>
        </div>
        <button
          onClick={() => setCancelled((c) => !c)}
          className={cn("h-11 rounded-ctl border px-4 text-13", cancelled ? "border-line text-text-2" : "border-block/60 text-block hover:bg-block/10")}
        >
          {cancelled ? "Reset demo" : "Cancel (guardian)"}
        </button>
      </div>
      <p className="mt-3 text-13 text-text-3">Guardians can cancel a queued action. Nobody, including guardians, can execute early.</p>
    </div>
  );
}
