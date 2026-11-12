"use client";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Check } from "./ui/Icons";

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
    <nav aria-label="Onboarding progress" className="border-b border-line bg-surface/40">
      <ol className="k-container flex h-14 items-center">
        {STEPS.map((s, i) => {
          const done = s.n < reached && i !== ci;
          const isCurrent = i === ci;
          const clickable = !isCurrent && s.n <= reached && (s.key === "link" || protocolId);
          const href = s.key === "link" ? "/connect" : `/p/${protocolId}/${s.key}`;
          const inner = (
            <span className="flex items-center gap-2.5 whitespace-nowrap">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border font-mono text-11 transition-colors duration-k",
                  isCurrent ? "border-text bg-text text-bg" : done ? "border-pass/40 bg-pass/10 text-pass" : "border-line-2 text-text-3",
                )}
              >
                {done ? <Check className="size-3" /> : s.n}
              </span>
              <span className={cn("text-13", isCurrent ? "font-medium text-text" : done ? "hidden text-text-2 md:inline" : "hidden text-text-3 md:inline")}>{s.label}</span>
              <span className="sr-only">{isCurrent ? "(current step)" : done ? "(completed)" : ""}</span>
            </span>
          );
          return (
            <li key={s.key} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
              {clickable ? (
                <Link href={href} className="-mx-1.5 rounded-ctl px-1.5 py-1.5 transition-colors duration-k hover:bg-surface-2">
                  {inner}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "step" : undefined}>{inner}</span>
              )}
              {i < STEPS.length - 1 ? <span aria-hidden className={cn("mx-3 h-px min-w-3 flex-1 md:mx-4", s.n < reached && i < ci ? "bg-pass/50" : "bg-line-2")} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
