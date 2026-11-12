"use client";
import { useState } from "react";
import type { Entrypoint, IntentSchema } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/StatusPill";
import { Stepper } from "./Stepper";
import { Decide } from "./Decide";

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
    <article className="overflow-hidden rounded-panel border border-line-2 bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="truncate font-mono text-11 tracking-[0.02em] text-text-3">{entry?.signature ?? schema.entrypointId}</p>
          <h3 className="mt-1.5 text-22 font-medium text-text">{eip.primaryType ?? "Intent"}</h3>
        </div>
        <StatusPill tone={schema.status === "approved" ? "pass" : schema.status === "rejected" ? "block" : "neutral"}>{schema.status}</StatusPill>
      </header>
      <div className="grid gap-x-10 gap-y-6 px-5 pb-5 pt-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          {schema.plainText ? <p className="mb-4 max-w-[40rem] text-15 text-text-2">{schema.plainText}</p> : null}
          <p className="mb-2 font-mono text-11 uppercase tracking-[0.06em] text-text-3">EIP-712 type · what the user signs</p>
          <pre className="overflow-x-auto rounded-ctl border border-line bg-surface-2 p-4 font-mono text-13 leading-relaxed text-text-2">
            {`${eip.primaryType ?? "Intent"} {\n${fields.map((f) => `  ${f.type} ${f.name};`).join("\n")}\n}`}
          </pre>
        </div>
        <div className="lg:col-span-5">
          <div className="rounded-ctl border border-line bg-surface-2/60 p-4">
            <p className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">Bounds</p>
            <div className="mt-3 grid gap-3">
              {Object.entries(bounds).map(([k, v]) =>
                typeof v === "number" ? (
                  <Stepper key={k} name={k} value={v} disabled={locked} onChange={(n) => setBounds((b) => ({ ...b, [k]: n }))} />
                ) : (
                  <p key={k} className="flex flex-wrap justify-between gap-2 font-mono text-13 text-text-3">
                    {k} <span className="text-text-2">{String(v)}</span>
                  </p>
                ),
              )}
              {Object.keys(bounds).length === 0 ? <p className="text-13 text-text-3">No bounds on this intent.</p> : null}
            </div>
            {dirty && !locked ? (
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <Button size="sm" onClick={() => onSave(bounds)} busy={busy}>
                  Save bounds
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBounds(initial)}>
                  Reset
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {!locked ? (
        <footer className="flex justify-end border-t border-line bg-surface-2/40 px-5 py-3">
          <Decide status={schema.status} onDecide={onDecide} />
        </footer>
      ) : null}
    </article>
  );
}
