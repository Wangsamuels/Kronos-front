"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RunEvent } from "@/api/types";
import { cn } from "@/lib/cn";
import { clockTime } from "@/lib/format";

export const STAGE_LABEL: Record<string, string> = {
  ingest: "INGEST",
  map: "MAP",
  schema: "SCHEMAS",
  schemas: "SCHEMAS",
  invariants: "INVARIANTS",
  tiers: "TIERS",
  redteam: "RED TEAM",
  verify: "VERIFY",
  review: "REVIEW",
  package: "PACKAGE",
  packaged: "PACKAGE",
  failed: "FAILED",
};
export const stageLabel = (s: string) => STAGE_LABEL[s] ?? s.toUpperCase();

type Row = { kind: "header"; stage: string; elapsed: string; key: string } | { kind: "line"; ev: RunEvent; key: string };

/** Group events under stage headers, with each stage's elapsed time. */
function toRows(events: RunEvent[], live: boolean): Row[] {
  const rows: Row[] = [];
  const firsts: { stage: string; ts: number; idx: number }[] = [];
  let cur: string | null = null;
  for (const ev of events) {
    const stage = stageLabel(ev.stage);
    if (stage !== cur) {
      cur = stage;
      firsts.push({ stage, ts: new Date(ev.ts).getTime(), idx: rows.length });
      rows.push({ kind: "header", stage, elapsed: "", key: `h-${ev.id}` });
    }
    rows.push({ kind: "line", ev, key: `e-${ev.id}` });
  }
  const lastTs = events.length ? new Date(events[events.length - 1]!.ts).getTime() : 0;
  firsts.forEach((f, i) => {
    const end = firsts[i + 1]?.ts ?? (live ? Date.now() : lastTs);
    const r = rows[f.idx];
    if (r && r.kind === "header") r.elapsed = `${Math.max(0, (end - f.ts) / 1000).toFixed(1)}s`;
  });
  return rows;
}

const ROW_H = 22;
const VIRTUAL_AFTER = 400;

/**
 * Mono live log with stage headers. Auto-scrolls; pauses when the user scrolls up. Virtualised
 * (fixed-height rows) once it grows past a few hundred lines.
 */
export function LogStream({ events, live, header, className }: { events: RunEvent[]; live: boolean; header?: React.ReactNode; className?: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setTick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, [live]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => toRows(events, live), [events, live, tick]);
  const ref = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  const [range, setRange] = useState<[number, number]>([0, 60]);
  const virtual = rows.length > VIRTUAL_AFTER;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setFollow(atBottom);
    if (virtual) {
      const start = Math.max(0, Math.floor(el.scrollTop / ROW_H) - 20);
      setRange([start, start + Math.ceil(el.clientHeight / ROW_H) + 40]);
    }
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && follow) {
      el.scrollTop = el.scrollHeight;
      if (virtual) {
        const start = Math.max(0, rows.length - Math.ceil(el.clientHeight / ROW_H) - 20);
        setRange([start, rows.length]);
      }
    }
  }, [rows.length, follow, virtual]);

  const visible = virtual ? rows.slice(range[0], range[1]) : rows;
  return (
    <div className={cn("k-panel relative flex min-h-0 flex-col", className)}>
      {header}
      <div
        ref={ref}
        onScroll={onScroll}
        className="min-h-[320px] flex-1 overflow-y-auto bg-surface-2/40 px-4 py-3 font-mono text-13 lg:max-h-[620px]"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Analysis log"
        tabIndex={0}
      >
        {virtual ? <div style={{ height: range[0] * ROW_H }} /> : null}
        {visible.map((r) =>
          r.kind === "header" ? (
            <div key={r.key} className={cn("flex items-center gap-3 pb-1 pt-3 first:pt-0", virtual && "h-[22px] py-0")}>
              <span className="text-11 tracking-[0.06em] text-text">{r.stage}</span>
              <span aria-hidden className="h-px flex-1 bg-line" />
              <span className="k-tnum text-11 text-text-3">{r.elapsed}</span>
            </div>
          ) : (
            <Line key={r.key} ev={r.ev} fixed={virtual} />
          ),
        )}
        {virtual ? <div style={{ height: Math.max(0, rows.length - range[1]) * ROW_H }} /> : null}
        {live ? <div className="mt-1 h-4 w-2 animate-pulse bg-text-3" aria-hidden /> : null}
      </div>
      {!follow ? (
        <button
          onClick={() => {
            setFollow(true);
            const el = ref.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          className="absolute bottom-3 right-4 h-8 rounded-ctl border border-line bg-surface px-3 font-mono text-11 text-text-2 hover:text-text"
        >
          ↓ follow live
        </button>
      ) : null}
    </div>
  );
}

function Line({ ev, fixed }: { ev: RunEvent; fixed?: boolean }) {
  const blocked = /^BLOCKED/.test(ev.message);
  const notBlocked = /^NOT BLOCKED/.test(ev.message);
  const tone =
    ev.type === "error" || ev.level === "error" || notBlocked
      ? "text-block"
      : ev.type === "done" || blocked
        ? "text-pass"
        : ev.level === "warn"
          ? "text-queue"
          : ev.type === "stage"
            ? "text-text"
            : "text-text-2";
  const tag = ev.type === "entrypoint" ? "entry" : ev.type === "invariant" ? "inv" : ev.type === "stage" ? "›" : ev.type === "done" ? "done" : ev.type === "error" ? "error" : "";
  return (
    <div className={cn("flex gap-3 py-0.5", fixed && "h-[22px] overflow-hidden whitespace-nowrap py-0")}>
      <span className="k-tnum w-[64px] shrink-0 text-text-3">{clockTime(ev.ts)}</span>
      <span className="w-10 shrink-0 text-text-3">{tag}</span>
      <span className={cn("min-w-0", tone, fixed ? "truncate" : "break-words")}>{ev.message}</span>
    </div>
  );
}
