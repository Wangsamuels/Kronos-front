"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

const STAGES = [
  { key: "intent", label: "Intent", checks: ["EIP-712 signature from the account", "Nonce unused, deadline not passed", "Calldata within signed bounds (amount, max LTV, min health, recipient)"] },
  { key: "pre", label: "Pre-checks", checks: ["Fresh oracle + solvency attestation (one per block, shared)", "Asset or oracle on probation → capped", "Admin calls: must come from the guard-owned timelock"] },
  { key: "exec", label: "Execute", checks: ["Your protocol's own function body runs unchanged", "Reentrancy lock held across the call"] },
  { key: "post", label: "Post-checks", checks: ["checkHealth: account health ≥ bound", "checkSolvency: cash + borrows ≥ deposits − reserves", "checkSharePrice: exchange-rate delta per tx", "checkOracle: spot vs attested 30m TWAP", "checkCap: collateral caps"] },
  { key: "out", label: "Outflow window", checks: ["Rolling 24h net outflow per asset and protocol", "Above threshold → queued, not reverted", "Released by delay, fresh attestation or guardian"] },
];

/** Users and admins enter through different doors and pass the same checks. */
export function GuardFlow() {
  const [active, setActive] = useState("post");
  const stage = STAGES.find((s) => s.key === active)!;
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="k-panel p-5 lg:col-span-7">
        <div className="grid grid-cols-2 gap-3 font-mono text-13">
          <div className="rounded-ctl border border-line bg-surface-2 p-3">
            <p className="k-label">door 1 · users</p>
            <p className="mt-1 text-text">signed intent → guarded(kind)</p>
          </div>
          <div className="rounded-ctl border border-line bg-surface-2 p-3">
            <p className="k-label">door 2 · admins</p>
            <p className="mt-1 text-text">timelock tier 0–3 → same guard</p>
          </div>
        </div>
        <div aria-hidden className="mx-auto my-3 h-6 w-px bg-line" />
        <ol className="grid gap-2" aria-label="Guard stages">
          {STAGES.map((s, i) => (
            <li key={s.key}>
              <button
                onMouseEnter={() => setActive(s.key)}
                onFocus={() => setActive(s.key)}
                onClick={() => setActive(s.key)}
                aria-pressed={active === s.key}
                className={cn("flex h-12 w-full items-center justify-between rounded-ctl border px-4 text-left transition-colors duration-k", active === s.key ? "border-text-3 bg-surface-2" : "border-line hover:bg-surface-2/60")}
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-11 text-text-3">0{i + 1}</span>
                  <span className="text-15 text-text">{s.label}</span>
                </span>
                <span className="font-mono text-11 text-text-3">{s.checks.length} checks</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-4 font-mono text-13 text-text-3">no one is exempt: users, attackers and your own admins hit the same modifier</p>
      </div>
      <aside className="k-panel p-5 lg:col-span-5" aria-live="polite">
        <p className="k-label">{stage.label} · what it checks</p>
        <ul className="mt-4 grid gap-3">
          {stage.checks.map((c) => (
            <li key={c} className="flex gap-3 text-15 text-text-2">
              <span aria-hidden className="mt-2 block size-1.5 shrink-0 rounded-full bg-pass" />
              {c}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
