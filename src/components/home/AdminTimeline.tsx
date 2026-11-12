"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Lock } from "@/components/ui/Icons";

const TIERS = [
  { tier: 0, delay: "Instant", days: 0, what: "Pause, lower caps. Tightening never waits." },
  { tier: 1, delay: "48 hours", days: 2, what: "Routine parameter changes." },
  { tier: 2, delay: "7 days", days: 7, what: "New collateral, oracle changes." },
  { tier: 3, delay: "14 days + co-sign", days: 14, what: "Upgrades, guard and key changes." },
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
  const elapsed = day >= 7;
  const pct = (d: number) => `${(d / 14) * 100}%`;
  return (
    <div>
      {/* tiers as a scale: the bar is the wait */}
      <div className="grid gap-px overflow-hidden rounded-panel border border-line-2 bg-line sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => (
          <div key={t.tier} className="bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <p className="k-label">Tier {t.tier}</p>
              {t.tier === 2 ? <span className="hidden font-mono text-11 text-queue md:inline">demo below</span> : null}
            </div>
            <p className="mt-3 text-22 font-medium text-text">{t.delay}</p>
            <div aria-hidden className="mt-3 h-1 rounded-full bg-surface-2">
              <div className={cn("h-full rounded-full", t.tier === 0 ? "bg-pass" : "bg-queue")} style={{ width: t.tier === 0 ? "3%" : pct(t.days) }} />
            </div>
            <p className="mt-4 text-15 text-text-2">{t.what}</p>
          </div>
        ))}
      </div>

      {/* the queue, on a 14-day ruler */}
      <div className="mt-6 rounded-panel border border-line-2 bg-surface">
        <div className="flex h-11 items-center justify-between border-b border-line px-5 font-mono text-11 uppercase tracking-[0.06em] text-text-3">
          <span>Public waiting queue · 1 pending</span>
          <span className="k-tnum">day {day.toFixed(1)}</span>
        </div>
        <div className="px-5 pb-2 pt-8">
          <div className="relative h-11">
            {/* ruler */}
            <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line-2" />
            {Array.from({ length: 15 }, (_, d) => (
              <span key={d} aria-hidden className={cn("absolute top-1/2 w-px -translate-y-1/2 bg-line-2", [0, 2, 7, 14].includes(d) ? "h-4 bg-text-3" : "h-2")} style={{ left: pct(d) }} />
            ))}
            {/* the tier 2 wait, filled as time passes */}
            <div aria-hidden className={cn("absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full", cancelled ? "bg-block/50" : "bg-queue/25")} style={{ width: pct(7) }} />
            <div aria-hidden className={cn("absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full", cancelled ? "bg-block" : "bg-queue")} style={{ width: pct(Math.min(day, 7)) }} />
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
              className="k-range absolute inset-0 h-11 w-full"
              aria-label="Scrub through 14 days"
              aria-valuetext={`day ${day}`}
            />
          </div>
          <div className="relative h-6 font-mono text-11 text-text-3" aria-hidden>
            {[0, 2, 7, 14].map((d) => (
              <span key={d} className={cn("absolute top-1", d === 0 ? "" : d === 14 ? "-translate-x-full" : "-translate-x-1/2", d === 7 && !cancelled && "text-queue", d === 2 && "hidden md:block")} style={{ left: pct(d) }}>
                {`${d}d`}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
          <div className="min-w-0 font-mono text-13">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={cn("k-tag", cancelled ? "k-tag-block" : elapsed ? "k-tag-idle" : "k-tag-queue")}>{cancelled ? "cancelled" : elapsed ? "delay elapsed" : "tier 2 · queued"}</span>
              <span className={cn("break-all", cancelled ? "text-text-3 line-through" : "text-text")}>listCollateral(FAKE, ownOracle, 75%)</span>
            </p>
            <p className="k-tnum mt-2 text-text-3">
              {cancelled ? "cancelled by a guardian · never executed" : elapsed ? "executes only if simulate-then-check passes" : `executes in ${left.toFixed(1)} days · proposer 0x6b11…c3e2`}
            </p>
          </div>
          <Button variant={cancelled ? "secondary" : "danger"} onClick={() => setCancelled((c) => !c)}>
            {cancelled ? "Reset demo" : "Cancel as guardian"}
          </Button>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-13 text-text-3">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        Guardians can cancel a queued action. Nobody, guardians included, can execute one early.
      </p>
    </div>
  );
}
