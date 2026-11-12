"use client";
import { cn } from "@/lib/cn";
import { Check, Cross } from "@/components/ui/Icons";

type Status = "approved" | "rejected" | "proposed";

/** Approve / Reject as one segmented control. Pressing the active side again returns to "proposed". */
export function Decide({ status, onDecide, busy }: { status: string; onDecide: (s: Status) => void; busy?: boolean }) {
  const seg = "inline-flex h-10 items-center gap-2 px-4 text-13 font-medium transition-colors duration-k disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div role="group" aria-label="Decision" className="inline-flex overflow-hidden rounded-ctl border border-line-2">
      <button
        type="button"
        disabled={busy}
        aria-pressed={status === "rejected"}
        onClick={() => onDecide(status === "rejected" ? "proposed" : "rejected")}
        className={cn(seg, "border-r border-line-2", status === "rejected" ? "bg-block/15 text-block" : "text-text-2 hover:bg-surface-2 hover:text-text")}
      >
        <Cross className="size-3.5" />
        {status === "rejected" ? "Rejected" : "Reject"}
      </button>
      <button
        type="button"
        disabled={busy}
        aria-pressed={status === "approved"}
        onClick={() => onDecide(status === "approved" ? "proposed" : "approved")}
        className={cn(seg, status === "approved" ? "bg-pass/15 text-pass" : "bg-text text-bg hover:bg-text/90")}
      >
        <Check className="size-3.5" />
        {status === "approved" ? "Approved" : "Approve"}
      </button>
    </div>
  );
}
