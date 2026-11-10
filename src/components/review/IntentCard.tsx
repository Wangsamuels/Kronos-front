"use client";
import { useState } from "react";
import type { Entrypoint, IntentSchema } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/StatusPill";
import { Stepper } from "./Stepper";

interface Eip712 {
  primaryType?: string;
  types?: Record<string, { name: string; type: string }[]>;
}

/** One card per user action: the EIP-712 type and editable bounds. */
export function IntentCard({ schema, entry, locked, busy, onSave, onDecide }: { schema: IntentSchema; entry?: Entrypoint; locked: boolean; busy?: boolean; onSave: (b: Record<string, unknown>) => void; onDecide: (s: "approved" | "rejected" | "proposed") => void }) {
  const eip = (schema.eip712 ?? {}) as Eip712;
  const fields = eip.primaryType ? eip.types?.[eip.primaryType] ?? [] : [];
  const initial = (schema.bounds ?? {}) as Record<string, unknown>;
  const [bounds, setBounds] = useState(initial);
  const dirty = JSON.stringify(bounds) !== JSON.stringify(initial);
  return (
    <article className="k-panel">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="k-label">{entry?.signature ?? schema.entrypointId}</p>
          <h3 className="mt-1 font-mono text-17 text-text">{eip.primaryType ?? "Intent"}</h3>
        </div>
        <StatusPill tone={schema.status === "approved" ? "pass" : schema.status === "rejected" ? "block" : "neutral"}>{schema.status}</StatusPill>
      </header>
      <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
        <div>
          <p className="k-label mb-2">EIP-712 type</p>
          <pre className="overflow-x-auto rounded-ctl border border-line bg-surface-2 p-3 font-mono text-13 text-text-2">
            {`${eip.primaryType ?? "Intent"} {\n${fields.map((f) => `  ${f.type} ${f.name};`).join("\n")}\n}`}
          </pre>
          {schema.plainText ? <p className="mt-3 text-13 text-text-2">{schema.plainText}</p> : null}
        </div>
        <div>
          <p className="k-label mb-2">Bounds</p>
          <div className="grid gap-2">
            {Object.entries(bounds).map(([k, v]) =>
              typeof v === "number" ? (
                <Stepper key={k} name={k} value={v} disabled={locked} onChange={(n) => setBounds((b) => ({ ...b, [k]: n }))} />
              ) : (
                <p key={k} className="font-mono text-13 text-text-3">
                  {k} <span className="text-text-2">{String(v)}</span>
                </p>
              ),
            )}
          </div>
          {dirty && !locked ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => onSave(bounds)} busy={busy}>
                Save bounds
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBounds(initial)}>
                Reset
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {!locked ? (
        <footer className="flex gap-2 border-t border-line px-5 py-3">
          <Button size="sm" variant={schema.status === "approved" ? "primary" : "secondary"} onClick={() => onDecide(schema.status === "approved" ? "proposed" : "approved")}>
            {schema.status === "approved" ? "✓ Approved" : "Approve"}
          </Button>
          <Button size="sm" variant={schema.status === "rejected" ? "danger" : "ghost"} onClick={() => onDecide(schema.status === "rejected" ? "proposed" : "rejected")}>
            {schema.status === "rejected" ? "✕ Rejected" : "Reject"}
          </Button>
        </footer>
      ) : null}
    </article>
  );
}
