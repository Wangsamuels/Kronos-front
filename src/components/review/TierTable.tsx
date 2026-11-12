"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import type { Entrypoint, Tier } from "@/api/types";
import { TIER_LABEL, TIER_SHORT, duration, tierDelay } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Tip } from "@/components/ui/Tip";
import { Check, Chevron } from "@/components/ui/Icons";

/** Privileged functions with a tier dropdown (0–3), the delay it implies, and rule locks. */
export function TierTable({ tiers, entries, locked, onChange }: { tiers: Tier[]; entries: Map<string, Entrypoint>; locked: boolean; onChange: (t: Tier, tier: number) => void }) {
  return (
    <div className="overflow-hidden rounded-panel border border-line-2 bg-surface">
      <div className="hidden min-h-11 grid-cols-12 items-center gap-4 border-b border-line px-5 md:grid">
        {["Function", "Tier", "Waits in public", "Set by"].map((h, i) => (
          <span key={h} className={cn("k-label", ["col-span-4", "col-span-3", "col-span-2", "col-span-3"][i])}>
            {h}
          </span>
        ))}
      </div>
      <ul>
        {tiers.map((t) => {
          const e = entries.get(t.entrypointId);
          const rule = t.source === "rule";
          return (
            <li key={t.id} className="grid gap-3 border-b border-line px-5 py-4 transition-colors duration-k last:border-b-0 hover:bg-surface-2/40 md:grid-cols-12 md:items-center md:gap-4">
              <div className="min-w-0 md:col-span-4">
                <p className="truncate font-mono text-13 text-text">{e?.signature ?? t.entrypointId}</p>
                <p className="mt-1 text-13 text-text-3">{t.rationale}</p>
              </div>
              <div className="md:col-span-3">
                <DM.Root>
                  <DM.Trigger
                    disabled={locked}
                    className="flex h-11 w-full items-center justify-between gap-2 rounded-ctl border border-line-2 bg-surface-2 px-3 font-mono text-13 text-text transition-colors duration-k hover:border-text-3 disabled:cursor-default disabled:border-line disabled:bg-transparent disabled:hover:border-line md:h-9"
                    aria-label={`Tier for ${e?.signature ?? "function"}`}
                  >
                    {TIER_LABEL[t.tier] ?? `Tier ${t.tier}`}
                    {locked ? null : <Chevron className="size-3.5 text-text-3" />}
                  </DM.Trigger>
                  <DM.Portal>
                    <DM.Content sideOffset={4} align="start" className="z-50 min-w-[260px] rounded-panel border border-line-2 bg-surface p-1 shadow-[0_16px_48px_-16px_rgb(0_0_0/0.8)]">
                      {[0, 1, 2, 3].map((n) => {
                        const disabled = rule && n < t.tier;
                        return (
                          <DM.Item
                            key={n}
                            disabled={disabled}
                            onSelect={() => n !== t.tier && onChange(t, n)}
                            className={cn(
                              "flex h-10 cursor-pointer items-center justify-between gap-4 rounded-ctl px-3 font-mono text-13 outline-none data-[highlighted]:bg-surface-2 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
                              n === t.tier ? "text-text" : "text-text-2",
                            )}
                          >
                            {TIER_LABEL[n]}
                            {disabled ? <span className="text-11 text-text-3">rule</span> : n === t.tier ? <Check className="size-3.5 text-text" /> : null}
                          </DM.Item>
                        );
                      })}
                    </DM.Content>
                  </DM.Portal>
                </DM.Root>
              </div>
              <span className={cn("k-tnum flex items-center gap-2 font-mono text-13 md:col-span-2", t.tier === 0 ? "text-pass" : "text-queue")}>
                <span aria-hidden className="block size-1.5 rounded-full bg-current" />
                {t.tier === 0 ? "no wait" : `${TIER_SHORT[t.tier] ?? duration(tierDelay(t.tier))}${t.tier === 3 ? " + co-sign" : ""}`}
              </span>
              <span className="font-mono text-13 text-text-3 md:col-span-3">
                {rule ? (
                  <Tip content={`${t.rationale ?? "Hard rule"} Hard rules can only be made stricter.`}>
                    <span tabIndex={0} className="inline-flex items-center gap-1.5 text-text-2">
                      <LockIcon /> hard rule · can only be raised
                    </span>
                  </Tip>
                ) : (
                  "AI draft"
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-label="locked">
      <rect x="1" y="5" width="9" height="6.5" rx="1.2" stroke="currentColor" />
      <path d="M3 5V3.6a2.5 2.5 0 015 0V5" stroke="currentColor" />
    </svg>
  );
}
