"use client";
import { useState } from "react";
import type { Invariant, InvariantEvidence } from "@/api/types";
import { Code } from "@/components/code/Code";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/cn";
import { Stepper } from "./Stepper";

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

  return (
    <article className={cn("k-panel", inv.needsReview && inv.status === "proposed" && "border-queue/50")} aria-labelledby={`inv-${inv.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="k-label">
            {inv.template}
            {inv.needsReview ? <span className="ml-2 text-queue">flagged</span> : null}
          </p>
          <h3 id={`inv-${inv.id}`} className="mt-1 text-17 font-medium text-text">
            {inv.title}
          </h3>
        </div>
        <StatusPill tone={inv.status === "approved" ? "pass" : inv.status === "rejected" ? "block" : inv.needsReview ? "queue" : "neutral"}>
          {inv.status === "proposed" ? (inv.needsReview ? "needs decision" : "proposed") : inv.status}
        </StatusPill>
      </header>
      <div className="grid gap-4 px-5 py-4">
        <p className="text-15 text-text-2">{inv.plainText}</p>

        {numeric.length || other.length ? (
          <div className="grid gap-2">
            {numeric.map(([k, v]) => (
              <Stepper key={k} name={k} value={v} disabled={locked} onChange={(n) => setParams((p) => ({ ...p, [k]: n }))} />
            ))}
            {other.map(([k, v]) => (
              <p key={k} className="font-mono text-13 text-text-3">
                {k} <span className="text-text">{JSON.stringify(v)}</span>
              </p>
            ))}
            {dirty && !locked ? (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => onSaveParams(params)} busy={busy}>
                  Save parameters
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setParams(inv.params as Record<string, unknown>)}>
                  Reset
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <dl className="grid gap-1 font-mono text-13">
          {ev.blockedBy?.length ? (
            <div className="flex gap-2">
              <dt className="text-text-3">evidence</dt>
              <dd className="text-pass">Blocked: {ev.blockedBy.join(", ")} replay</dd>
            </div>
          ) : ev.stops ? (
            <div className="flex gap-2">
              <dt className="text-text-3">stops</dt>
              <dd className="text-text-2">{ev.stops}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="text-text-3">drafters</dt>
            <dd className={agree ? "text-text-2" : "text-queue"}>{agree ? `A + B agree` : `only ${inv.drafters.join(", ") || "one drafter"}${ev.disagreement ? ` · ${ev.disagreement}` : ""}`}</dd>
          </div>
          {ev.rationale ? (
            <div className="flex gap-2">
              <dt className="text-text-3">note</dt>
              <dd className="text-text-2">{ev.rationale}</dd>
            </div>
          ) : null}
        </dl>

        <div>
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="font-mono text-13 text-text-2 hover:text-text">
            {open ? "− hide Solidity" : "+ show Solidity"}
          </button>
          {open ? (
            <div className="mt-2 overflow-hidden rounded-ctl border border-line bg-surface-2">
              <Code code={inv.solidity} lang="solidity" />
            </div>
          ) : null}
        </div>
      </div>
      {!locked ? (
        <footer className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
          <Button size="sm" variant={inv.status === "approved" ? "primary" : "secondary"} onClick={() => onDecide(inv.status === "approved" ? "proposed" : "approved")} busy={busy} aria-pressed={inv.status === "approved"}>
            {inv.status === "approved" ? "✓ Approved" : "Approve"}
          </Button>
          <Button size="sm" variant={inv.status === "rejected" ? "danger" : "ghost"} onClick={() => onDecide(inv.status === "rejected" ? "proposed" : "rejected")} aria-pressed={inv.status === "rejected"}>
            {inv.status === "rejected" ? "✕ Rejected" : "Reject"}
          </Button>
        </footer>
      ) : null}
    </article>
  );
}
