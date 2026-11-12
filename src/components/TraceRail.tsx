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

const SHORT: Record<string, string> = { "Pre-checks": "Pre", Execute: "Exec", "Post-checks": "Post", "Outflow window": "Outflow" };
const VERDICT = {
  passed: { word: "passed", tag: "k-tag-pass", text: "text-pass" },
  blocked: { word: "reverted", tag: "k-tag-block", text: "text-block" },
  queued: { word: "queued", tag: "k-tag-queue", text: "text-queue" },
} as const;

/**
 * The signature motion, framed as the guard's console: one transaction moves through
 * Intent → Pre-checks → Execute → Post-checks → Outflow window while the last few verdicts scroll
 * underneath. Passed stages flash --pass for 120ms; a blocked trace stops, its node turns --block and
 * the reason types out. Pauses off-screen. Reduced motion shows each end state at once.
 */
export function TraceRail({ traces = SCRIPTED_TRACES, stages = GUARD_STAGES as readonly string[], className }: { traces?: Trace[]; stages?: readonly string[]; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ti, setTi] = useState(2); // start on the oracle pump so the first paint shows a block
  const [nodes, setNodes] = useState<NodeState[]>(() => endState(traces[2]!, stages.length));
  const [typed, setTyped] = useState(traces[2]?.reason ?? "");
  const n = traces.length;
  const trace = traces[ti % n]!;

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
  const settled = nodes.some((s) => s === "block" || s === "queue") || nodes.every((s) => s === "pass");
  const v = VERDICT[trace.verdict];
  // The four traces before the current one, newest first. Derived from the index, so it is deterministic.
  const history = [1, 2, 3, 4].map((k) => ({ key: ti - k, t: traces[(((ti - k) % n) + n) % n]! }));

  return (
    <div ref={ref} className={cn("overflow-hidden rounded-panel border border-line-2 bg-surface shadow-[0_24px_80px_-32px_rgb(0_0_0/0.9)]", className)} aria-label="Guard console replaying scripted transactions">
      {/* title bar */}
      <div className="flex h-11 items-center justify-between gap-3 border-b border-line px-4">
        <span className="flex items-center gap-2.5 font-mono text-11 uppercase tracking-[0.08em] text-text-2">
          <span className="relative flex size-2">
            <span aria-hidden className="absolute inset-0 animate-k-ping rounded-full bg-pass" />
            <span aria-hidden className="relative block size-2 rounded-full bg-pass" />
          </span>
          Guard live
        </span>
        <span className="truncate font-mono text-11 text-text-3">
          GuardedMiniLend<span className="hidden min-[420px]:inline"> · base-sepolia</span>
        </span>
      </div>

      {/* current transaction */}
      <div className="px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-mono text-15 text-text">
            <span className="text-text-3">{trace.action}</span> {trace.amount}
          </p>
          <span className="hidden shrink-0 font-mono text-11 text-text-3 min-[520px]:block">{trace.tx}</span>
        </div>

        <ol className="mt-6 grid grid-cols-5" aria-label="Guard stages">
          {stages.map((s, i) => {
            const st = nodes[i] ?? "idle";
            const reached = st !== "idle";
            return (
              <li key={s} className="relative">
                {i < stages.length - 1 ? (
                  <span aria-hidden className="absolute left-[11px] right-0 top-[5px] h-px bg-line-2">
                    <span className={cn("block h-full origin-left bg-pass transition-transform duration-300 ease-k", st === "pass" ? "scale-x-100" : "scale-x-0")} />
                  </span>
                ) : null}
                <span
                  className={cn(
                    "relative z-10 block size-[11px] rounded-full border-[1.5px] bg-surface transition-colors duration-[120ms]",
                    st === "idle" && "border-text-3",
                    (st === "pass" || st === "flash") && "border-pass bg-pass",
                    st === "flash" && "shadow-[0_0_0_4px_rgb(var(--pass)/0.25)]",
                    st === "block" && "border-block bg-block shadow-[0_0_0_4px_rgb(var(--block)/0.2)]",
                    st === "queue" && "border-queue bg-queue shadow-[0_0_0_4px_rgb(var(--queue)/0.2)]",
                  )}
                />
                <span className={cn("mt-3 block pr-1 font-mono text-[10px] uppercase leading-tight tracking-[0.04em] min-[520px]:text-11", st === "block" ? "text-block" : st === "queue" ? "text-queue" : reached ? "text-text" : "text-text-3")}>
                  <span className="min-[520px]:hidden">{SHORT[s] ?? s}</span>
                  <span className="hidden min-[520px]:inline">{s}</span>
                </span>
              </li>
            );
          })}
        </ol>

        {/* Verdict: neutral surface, no colored stripe. Only the tag carries color. */}
        <div className="mt-5 min-h-[104px] rounded-ctl border border-line bg-surface-2 px-4 py-3 font-mono text-13" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className={cn("k-tag transition-opacity duration-k", v.tag, settled ? "opacity-100" : "opacity-0")}>{v.word}</span>
            <span className="truncate text-11 uppercase tracking-[0.06em] text-text-3">
              {stopped && trace.stopAt !== undefined ? `at ${stages[trace.stopAt]}` : `${stages.length}/${stages.length} stages`}
            </span>
          </div>
          {stopped ? (
            <>
              <p className="mt-2.5 break-words text-text">
                {typed || "\u00a0"}
                {typed && typed !== trace.reason ? <span aria-hidden className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-0.5 bg-text-2" /> : null}
              </p>
              <p className="mt-1 text-text-3">{trace.detail}</p>
            </>
          ) : (
            <>
              <p className={cn("mt-2.5 text-text transition-opacity duration-k", settled ? "opacity-100" : "opacity-40")}>all checks passed</p>
              <p className="mt-1 text-text-3">intent signed · attestation fresh · state within bounds</p>
            </>
          )}
        </div>
      </div>

      {/* recent verdicts */}
      <div className="border-t border-line">
        <p className="flex items-center justify-between px-4 pb-1 pt-3 font-mono text-11 uppercase tracking-[0.08em] text-text-3 sm:px-5">
          <span>Recent</span>
          <span>scripted replay</span>
        </p>
        <ul className="px-4 pb-3 font-mono text-13 sm:px-5">
          {history.map(({ key, t }, i) => (
            <li key={key} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 border-t border-line/70 py-2 first:border-t-0 min-[520px]:grid-cols-[7.5rem_1fr_auto]", i === 0 && !reduce && "animate-k-row-in", i === 3 && "hidden min-[520px]:grid")}>
              <span className="hidden text-text-3 min-[520px]:block">{t.tx}</span>
              <span className="min-w-0 truncate text-text-2">
                <span className="text-text-3">{t.action}</span> {t.amount}
              </span>
              <span className={cn("text-11 uppercase tracking-[0.06em]", VERDICT[t.verdict].text)}>{VERDICT[t.verdict].word}</span>
            </li>
          ))}
        </ul>
      </div>
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
