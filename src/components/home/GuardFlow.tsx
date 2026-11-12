"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { ArrowRight, Check } from "@/components/ui/Icons";

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
  const ai = STAGES.findIndex((s) => s.key === active);
  const stage = STAGES[ai]!;
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        {/* two doors */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { who: "Users", door: "Door 1", how: "signed EIP-712 intent", code: "guarded(kind, intent, sig)" },
            { who: "Admins", door: "Door 2", how: "timelock, tier 0 to 3", code: "onlyTimelock → same guard" },
          ].map((d) => (
            <div key={d.who} className="rounded-panel border border-line-2 bg-surface p-4 sm:p-5">
              <p className="k-label">{d.door}</p>
              <p className="mt-2 text-22 font-medium text-text">{d.who}</p>
              <p className="mt-1 text-13 text-text-2">{d.how}</p>
              <p className="mt-3 hidden truncate font-mono text-11 text-text-3 md:block">{d.code}</p>
            </div>
          ))}
        </div>
        {/* the doors merge into one path */}
        <div aria-hidden className="relative mx-[25%] h-8 border-x border-b border-line-2">
          <span className="absolute left-1/2 top-full h-5 w-px -translate-x-1/2 bg-line-2" />
        </div>
        <div aria-hidden className="h-5" />

        <ol className="overflow-hidden rounded-panel border border-line-2" aria-label="Guard stages">
          {STAGES.map((s, i) => {
            const on = active === s.key;
            return (
              <li key={s.key} className="border-b border-line last:border-b-0">
                <button
                  onMouseEnter={() => setActive(s.key)}
                  onFocus={() => setActive(s.key)}
                  onClick={() => setActive(s.key)}
                  aria-pressed={on}
                  className={cn("relative flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left transition-colors duration-k sm:px-5", on ? "bg-surface-2" : "bg-surface hover:bg-surface-2/60")}
                >
                  <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5 transition-colors duration-k", on ? "bg-text" : "bg-transparent")} />
                  <span className="flex items-center gap-4">
                    <span className={cn("font-mono text-11", on ? "text-text" : "text-text-3")}>0{i + 1}</span>
                    <span className={cn("text-17", on ? "text-text" : "text-text-2")}>{s.label}</span>
                  </span>
                  <span className="flex items-center gap-3 font-mono text-11 text-text-3">
                    {s.checks.length} checks
                    <ArrowRight className={cn("size-3.5 transition-opacity duration-k", on ? "opacity-100" : "opacity-0")} />
                  </span>
                </button>
                {/* On small screens the checks open in place, under the stage that owns them. */}
                {on ? (
                  <ul className="grid gap-2.5 border-t border-line bg-surface-2 px-4 py-4 lg:hidden">
                    {s.checks.map((c) => (
                      <CheckItem key={c} text={c} />
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="hidden lg:col-span-5 lg:block" aria-live="polite">
        <div className="sticky top-24 rounded-panel border border-line-2 bg-surface">
          <div className="flex h-11 items-center justify-between border-b border-line px-5 font-mono text-11 uppercase tracking-[0.06em] text-text-3">
            <span>
              Stage 0{ai + 1} · {stage.label}
            </span>
            <span>{stage.checks.length} checks</span>
          </div>
          <ul className="grid min-h-[236px] content-start gap-3.5 p-5">
            {stage.checks.map((c) => (
              <CheckItem key={c} text={c} />
            ))}
          </ul>
          <p className="border-t border-line px-5 py-4 text-13 text-text-3">Any failed check reverts the whole transaction. Outflow over the threshold is queued instead.</p>
        </div>
      </aside>
    </div>
  );
}

/** "checkOracle: spot vs TWAP" renders the function name in mono, the rest as prose. */
function CheckItem({ text }: { text: string }) {
  const m = /^(check\w+):\s*(.*)$/.exec(text);
  return (
    <li className="flex gap-3 text-15 text-text-2">
      <Check className="mt-1 size-3.5 shrink-0 text-pass" />
      {m ? (
        <span>
          <code className="font-mono text-13 text-text">{m[1]}</code>
          <span className="mx-2 text-text-3">·</span>
          {m[2]}
        </span>
      ) : (
        <span>{text}</span>
      )}
    </li>
  );
}
