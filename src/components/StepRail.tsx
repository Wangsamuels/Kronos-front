"use client";
import Link from "next/link";
import { cn } from "@/lib/cn";

export const STEPS = [
  { n: 1, key: "link", label: "Link" },
  { n: 2, key: "analysis", label: "Analyze" },
  { n: 3, key: "review", label: "Review" },
  { n: 4, key: "integrate", label: "Integrate" },
  { n: 5, key: "verify", label: "Verify" },
] as const;
export type StepKey = (typeof STEPS)[number]["key"];

/** Furthest step a protocol has reached, from its server-side status (progress is saved on the server). */
export function reachedStep(status?: string, runStatus?: string): number {
  if (!status) return 1;
  if (status === "live" || status === "paused") return 5;
  if (status === "integrating") return 5;
  if (runStatus === "packaged") return 4;
  if (status === "approved") return 3;
  if (status === "review") return 3;
  if (status === "analyzing" || status === "draft" || status === "unsupported") return 2;
  return 2;
}

/** The 5-step onboarding progress rail. Completed steps are clickable. */
export function StepRail({ current, protocolId, reached }: { current: StepKey; protocolId?: string; reached: number }) {
  const ci = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Onboarding progress" className="border-b border-line">
      <ol className="k-container flex h-12 items-center gap-1 overflow-x-auto">
        {STEPS.map((s, i) => {
          const done = s.n < reached && i !== ci;
          const isCurrent = i === ci;
          const clickable = !isCurrent && s.n <= reached && (s.key === "link" || protocolId);
          const href = s.key === "link" ? "/connect" : `/p/${protocolId}/${s.key}`;
          const inner = (
            <span className="flex items-center gap-2 whitespace-nowrap px-2 py-1">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border font-mono text-11",
                  isCurrent ? "border-text bg-text text-bg" : done ? "border-pass text-pass" : "border-line text-text-3",
                )}
              >
                {done ? "✓" : s.n}
              </span>
              <span className={cn("text-13", isCurrent ? "text-text" : done ? "text-text-2" : "text-text-3")}>{s.label}</span>
              <span className="sr-only">{isCurrent ? "(current step)" : done ? "(completed)" : ""}</span>
            </span>
          );
          return (
            <li key={s.key} className="flex items-center">
              {clickable ? (
                <Link href={href} className="rounded-ctl hover:bg-surface-2" aria-current={isCurrent ? "step" : undefined}>
                  {inner}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "step" : undefined}>{inner}</span>
              )}
              {i < STEPS.length - 1 ? <span aria-hidden className="mx-1 h-px w-6 bg-line" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
