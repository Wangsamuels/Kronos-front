"use client";
import { useState } from "react";
import type { Invariant, InvariantEvidence } from "@/api/types";
import { Code } from "@/components/code/Code";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/cn";
import { Stepper } from "./Stepper";
import { Decide } from "./Decide";
import { Chevron } from "@/components/ui/Icons";

/** Rule text, Solidity (Shiki, collapsible), param controls, evidence, approve/reject. */
export function InvariantCard({
  inv,
  locked,
  busy,
  onDecide,
  onSaveParams,
}: {
  inv: Invariant;
  locked: boolean;
  busy?: boolean;
  onDecide: (status: "approved" | "rejected" | "proposed") => void;
  onSaveParams: (params: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<Record<string, unknown>>(inv.params as Record<string, unknown>);
  const dirty = JSON.stringify(params) !== JSON.stringify(inv.params);
  const ev = (inv.evidence ?? {}) as InvariantEvidence;
  const agree = inv.drafters.length >= 2;
  const numeric = Object.entries(params).filter(([, v]) => typeof v === "number") as [string, number][];
  const other = Object.entries(params).filter(([, v]) => typeof v !== "number");

  const needs = inv.needsReview && inv.status === "proposed";

  return (
    <article className={cn("overflow-hidden rounded-panel border bg-surface", needs ? "border-queue/50" : "border-line-2")} aria-labelledby={`inv-${inv.id}`}>
      {needs ? (
        <p className="flex items-center gap-2.5 border-b border-queue/30 bg-queue/[0.07] px-5 py-2.5 text-13 text-queue">
          <span aria-hidden className="block size-1.5 rounded-full bg-queue" />
          The drafters disagreed on this rule. It needs your decision before the guard can be built.
        </p>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">{inv.template}</p>
          <h3 id={`inv-${inv.id}`} className="mt-1.5 text-22 font-medium text-text">
            {inv.title}
          </h3>
        </div>
        <StatusPill tone={inv.status === "approved" ? "pass" : inv.status === "rejected" ? "block" : inv.needsReview ? "queue" : "neutral"}>
          {inv.status === "proposed" ? (inv.needsReview ? "needs decision" : "proposed") : inv.status}
        </StatusPill>
      </header>

      <div className="grid gap-x-10 gap-y-6 px-5 pb-5 pt-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="max-w-[40rem] text-15 text-text-2">{inv.plainText}</p>

          <dl className="mt-5 grid gap-2.5 border-t border-line pt-4 text-13">
            {ev.blockedBy?.length ? (
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <dt className="font-mono text-11 uppercase leading-5 tracking-[0.06em] text-text-3">evidence</dt>
                <dd className="flex flex-wrap items-center gap-2 text-text-2">
                  <span className="k-tag k-tag-block">blocked</span>
                  {ev.blockedBy.join(", ").replace(/ replay$/, "")} replay
                </dd>
              </div>
            ) : ev.stops ? (
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <dt className="font-mono text-11 uppercase leading-5 tracking-[0.06em] text-text-3">stops</dt>
                <dd className="text-text-2">{ev.stops}</dd>
              </div>
            ) : null}
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <dt className="font-mono text-11 uppercase leading-5 tracking-[0.06em] text-text-3">drafters</dt>
              <dd className={agree ? "text-text-2" : "text-queue"}>{agree ? "A and B agree" : `only ${inv.drafters.join(", ") || "one drafter"}${ev.disagreement ? ` · ${ev.disagreement}` : ""}`}</dd>
            </div>
            {ev.rationale ? (
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <dt className="font-mono text-11 uppercase leading-5 tracking-[0.06em] text-text-3">note</dt>
                <dd className="text-text-2">{ev.rationale}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        {numeric.length || other.length ? (
          <div className="lg:col-span-5">
            <div className="rounded-ctl border border-line bg-surface-2/60 p-4">
              <p className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">Parameters</p>
              <div className="mt-3 grid gap-3">
                {numeric.map(([k, v]) => (
                  <Stepper key={k} name={k} value={v} disabled={locked} onChange={(n) => setParams((p) => ({ ...p, [k]: n }))} />
                ))}
                {other.map(([k, v]) => (
                  <p key={k} className="flex flex-wrap justify-between gap-2 font-mono text-13 text-text-3">
                    {k} <span className="text-text">{JSON.stringify(v)}</span>
                  </p>
                ))}
              </div>
              {dirty && !locked ? (
                <div className="mt-4 flex gap-2 border-t border-line pt-4">
                  <Button size="sm" onClick={() => onSaveParams(params)} busy={busy}>
                    Save parameters
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setParams(inv.params as Record<string, unknown>)}>
                    Reset
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-line bg-surface-2">
          <Code code={inv.solidity} lang="solidity" />
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-5 py-3">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex h-10 items-center gap-2 rounded-ctl text-13 text-text-2 transition-colors duration-k hover:text-text">
          <Chevron className={cn("size-3.5 transition-transform duration-k", open && "rotate-180")} />
          {open ? "Hide Solidity" : "Show Solidity"}
        </button>
        {!locked ? <Decide status={inv.status} onDecide={onDecide} busy={busy} /> : null}
      </footer>
    </article>
  );
}
