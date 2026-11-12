import { cn } from "@/lib/cn";
import { errorMessage } from "@/api/errors";
import { Button } from "./Button";
import { Refresh } from "./Icons";

/** Loading: skeleton lines in --surface-2, never a centred spinner. */
export function Skeleton({ className, lines = 1 }: { className?: string; lines?: number }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4"];
  return (
    <div aria-hidden className="space-y-2.5">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={cn("k-shimmer h-4 rounded-[4px]", i === lines - 1 && lines > 1 ? "w-2/5" : widths[i % widths.length], className)} />
      ))}
    </div>
  );
}

export function LoadingBlock({ label = "Loading", lines = 4, className }: { label?: string; lines?: number; className?: string }) {
  return (
    <div className={cn("p-5", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton lines={lines} />
    </div>
  );
}

/** Empty: one sentence and the next action. `title` is optional for the larger, full-panel empties. */
export function EmptyState({ children, action, title, className }: { children: React.ReactNode; action?: React.ReactNode; title?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-4 px-5 py-8 md:px-6", className)}>
      <span aria-hidden className="grid size-9 place-items-center rounded-ctl border border-dashed border-line-2 font-mono text-13 text-text-3">
        /
      </span>
      <div>
        {title ? <p className="text-17 font-medium text-text">{title}</p> : null}
        <p className={cn("max-w-[34rem] text-15 text-text-2", title && "mt-1")}>{children}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ what, error, onRetry, className }: { what: string; error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-3 px-5 py-8 md:px-6", className)}>
      <span className="k-tag k-tag-block">error</span>
      <div>
        <p className="text-17 font-medium text-text">Couldn’t load {what}.</p>
        <p className="mt-1 break-words font-mono text-13 text-text-2">{errorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <Refresh className="size-3.5" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/** Stale: data older than expected, shown with its timestamp. */
export function StaleNote({ updatedAt, maxAgeMs, className }: { updatedAt: number; maxAgeMs: number; className?: string }) {
  if (!updatedAt) return null;
  const age = Date.now() - updatedAt;
  const stale = age > maxAgeMs;
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-11", stale ? "text-queue" : "text-text-3", className)} title={new Date(updatedAt).toISOString()}>
      <span aria-hidden className={cn("block size-1.5 rounded-full", stale ? "bg-queue" : "bg-text-3")} />
      {stale ? "stale · " : ""}updated {new Date(updatedAt).toLocaleTimeString("en-GB", { hour12: false })}
    </span>
  );
}
