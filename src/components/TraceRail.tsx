"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "framer-motion";

export const GUARD_STAGES = ["Intent", "Pre-checks", "Execute", "Post-checks", "Outflow window"] as const;

export interface Trace {
  tx: string;
  action: string;
  amount: string;
  /** Stage index where it stopped; undefined = passed every stage. */
  stopAt?: number;
  verdict: "passed" | "blocked" | "queued";
  reason?: string;
  detail?: string;
}

/** 12 scripted, deterministic traces (no randomness, so screenshots stay stable). */
export const SCRIPTED_TRACES: Trace[] = [
  { tx: "0x1b4e…7a02", action: "deposit", amount: "50,000 USDC", verdict: "passed" },
  { tx: "0x9c21…e4f1", action: "borrow", amount: "12,000 USDC", verdict: "passed" },
  { tx: "0xf3a1…c92e", action: "borrow", amount: "2,400,000 USDC", stopAt: 3, verdict: "blocked", reason: "checkOracle: price 41% above 30m TWAP → reverted", detail: "borrow 2,400,000 USDC against thin collateral" },
  { tx: "0x44d0…19bb", action: "repay", amount: "8,250 USDC", verdict: "passed" },
  { tx: "0x7e90…0c3d", action: "withdraw", amount: "3.2 WETH", verdict: "passed" },
  { tx: "0xc419…77f0", action: "deposit", amount: "1 wei donation", stopAt: 3, verdict: "blocked", reason: "checkSharePrice: exchange rate +38% in one tx → reverted", detail: "donation before first mint inflates share price" },
  { tx: "0x2a6f…d1e8", action: "liquidate", amount: "41,000 USDC", verdict: "passed" },
  { tx: "0x88c0…1ab4", action: "withdraw", amount: "180,000 USDC", stopAt: 4, verdict: "queued", reason: "outflowWindow: 24h net outflow over threshold → queued 14m", detail: "released after a fresh attestation or by a guardian" },
  { tx: "0x5d33…a9c7", action: "borrow", amount: "6,100 USDC", verdict: "passed" },
  { tx: "0x0b77…e441", action: "listCollateral", amount: "FAKE / own oracle", stopAt: 1, verdict: "queued", reason: "tier2Timelock: risk-adding change → queued 7 days", detail: "guardians can cancel; nobody can skip the delay" },
  { tx: "0x6f12…3be0", action: "borrow", amount: "900 USDC", stopAt: 0, verdict: "blocked", reason: "intent: amount 9,000 > signed bound 900 → reverted", detail: "calldata does not match the signed EIP-712 intent" },
  { tx: "0xa0e5…5c19", action: "flashLoan", amount: "250,000 USDC", verdict: "passed" },
];

type NodeState = "idle" | "pass" | "flash" | "block" | "queue";

/**
 * The signature motion: a transaction moving through Intent → Pre-checks → Execute → Post-checks →
 * Outflow window. Passed stages flash --pass for 120ms; a blocked trace stops, its node turns
 * --block and the reason types out. Pauses off-screen. Reduced motion shows each end state at once.
 */
export function TraceRail({ traces = SCRIPTED_TRACES, stages = GUARD_STAGES as readonly string[], compact, className }: { traces?: Trace[]; stages?: readonly string[]; compact?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ti, setTi] = useState(2); // start on the oracle pump so the first paint shows a block
  const [nodes, setNodes] = useState<NodeState[]>(() => endState(traces[2]!, stages.length));
  const [typed, setTyped] = useState(traces[2]?.reason ?? "");
  const trace = traces[ti % traces.length]!;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = traces[ti % traces.length]!;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    if (reduce) {
      setNodes(endState(t, stages.length));
      setTyped(t.reason ?? "");
      at(3200, () => setTi((i) => i + 1));
      return () => timers.forEach(clearTimeout);
    }
    setNodes(Array(stages.length).fill("idle"));
    setTyped("");
    const last = t.stopAt ?? stages.length - 1;
    let ms = 250;
    for (let i = 0; i <= last; i++) {
      const stopHere = t.stopAt === i;
      at(ms, () =>
        setNodes((n) => n.map((s, j) => (j === i ? (stopHere ? (t.verdict === "queued" ? "queue" : "block") : "flash") : s))),
      );
      if (!stopHere) at(ms + 120, () => setNodes((n) => n.map((s, j) => (j === i ? "pass" : s))));
      ms += 380;
    }
    if (t.reason) {
      const r = t.reason;
      for (let c = 1; c <= r.length; c++) at(ms + c * 18, () => setTyped(r.slice(0, c)));
      ms += r.length * 18 + 2200;
    } else ms += 900;
    at(ms, () => setTi((i) => i + 1));
    return () => timers.forEach(clearTimeout);
  }, [ti, visible, reduce, traces, stages.length]);

  const stopped = trace.verdict !== "passed";
  return (
    <div ref={ref} className={cn("k-panel bg-surface p-5", className)} aria-label="Live guard trace (scripted)">
      <div className="flex items-center justify-between">
        <span className="k-label">Live trace</span>
        <span className="font-mono text-13 text-text-2">{trace.tx}</span>
      </div>
      {/* horizontal on lg+, vertical on small screens */}
      <ol className={cn("mt-5 grid gap-0", compact ? "" : "lg:grid-cols-5", "grid-cols-1")}>
        {stages.map((s, i) => {
          const st = nodes[i] ?? "idle";
          return (
            <li key={s} className={cn("relative flex items-center gap-3 py-1.5", compact ? "" : "lg:flex-col lg:items-start lg:gap-2 lg:py-0")}>
              <span className="relative flex items-center">
                <span
                  className={cn(
                    "relative z-10 block size-2.5 rounded-full border transition-colors duration-[120ms]",
                    st === "idle" && "border-text-3 bg-transparent",
                    (st === "pass" || st === "flash") && "border-pass bg-pass",
                    st === "flash" && "shadow-[0_0_0_4px_rgb(var(--pass)/0.25)]",
                    st === "block" && "border-block bg-block",
                    st === "queue" && "border-queue bg-queue",
                  )}
                />
              </span>
              {i < stages.length - 1 ? (
                <span aria-hidden className={cn("absolute left-[4.5px] top-[18px] h-[calc(100%-12px)] w-px bg-line", compact ? "" : "lg:left-3 lg:top-[4.5px] lg:h-px lg:w-[calc(100%-12px)]")} />
              ) : null}
              <span className={cn("font-mono text-11", st === "block" ? "text-block" : st === "queue" ? "text-queue" : "text-text-3")}>{s}</span>
            </li>
          );
        })}
      </ol>
      <div className={cn("mt-5 min-h-[64px] rounded-ctl border border-line bg-surface-2 px-4 py-3 font-mono text-13", stopped && (trace.verdict === "blocked" ? "border-l-2 border-l-block" : "border-l-2 border-l-queue"))} aria-live="polite">
        {stopped ? (
          <>
            <p className={trace.verdict === "blocked" ? "text-block" : "text-queue"}>{typed || "\u00a0"}</p>
            <p className="mt-1 text-text-2">{trace.detail}</p>
          </>
        ) : (
          <>
            <p className="text-pass">all checks passed</p>
            <p className="mt-1 text-text-2">
              {trace.action} {trace.amount} · intent signed · attestation fresh
            </p>
          </>
        )}
      </div>
      <p className="mt-3 font-mono text-13 text-text-3">
        action <span className="text-text">{trace.action}</span>
        <span className="px-2" />
        amount <span className="text-text">{trace.amount}</span>
        <span className="px-2" />
        verdict <span className={trace.verdict === "blocked" ? "text-block" : trace.verdict === "queued" ? "text-queue" : "text-pass"}>{trace.verdict}</span>
      </p>
    </div>
  );
}

function endState(t: Trace, n: number): NodeState[] {
  return Array.from({ length: n }, (_, i) => {
    if (t.stopAt === undefined) return "pass";
    if (i < t.stopAt) return "pass";
    if (i === t.stopAt) return t.verdict === "queued" ? "queue" : "block";
    return "idle";
  });
}

/** Small static rail for pipeline progress (Analyze screen). */
export function StageRail({ stages, current, failed, done }: { stages: { key: string; label: string }[]; current?: string; failed?: string; done?: boolean }) {
  const idx = stages.findIndex((s) => s.key === current);
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Pipeline stages">
      {stages.map((s, i) => {
        const state = failed === s.key ? "block" : done || i < idx ? "pass" : i === idx ? "active" : "idle";
        return (
          <li key={s.key} className="flex items-center gap-1">
            <span
              className={cn(
                "block size-2 rounded-full border",
                state === "pass" && "border-pass bg-pass",
                state === "active" && "animate-pulse border-text bg-text",
                state === "block" && "border-block bg-block",
                state === "idle" && "border-text-3",
              )}
            />
            <span className={cn("font-mono text-11 uppercase tracking-[0.06em]", state === "active" ? "text-text" : state === "block" ? "text-block" : "text-text-3")}>
              {s.label}
              <span className="sr-only"> {state === "pass" ? "done" : state === "active" ? "running" : state === "block" ? "failed" : "pending"}</span>
            </span>
            {i < stages.length - 1 ? <span aria-hidden className="mx-1 h-px w-4 bg-line" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
