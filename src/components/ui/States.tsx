import { cn } from "@/lib/cn";
import { errorMessage } from "@/api/errors";
import { Button } from "./Button";

/** Loading: skeleton lines in --surface-2, never a centred spinner. */
export function Skeleton({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div aria-hidden className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={cn("h-4 animate-pulse rounded-ctl bg-surface-2", i === lines - 1 && lines > 1 && "w-2/3", className)} />
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

export function EmptyState({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-3 p-5 text-15 text-text-2", className)}>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function ErrorState({ what, error, onRetry, className }: { what: string; error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-3 p-5", className)}>
      <p className="text-15 text-text">
        <span className="font-mono text-13 text-block">error</span> · Couldn’t load {what}.
      </p>
      <p className="font-mono text-13 text-text-2">{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
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
    <span className={cn("font-mono text-11", stale ? "text-queue" : "text-text-3", className)} title={new Date(updatedAt).toISOString()}>
      {stale ? "stale · " : ""}updated {new Date(updatedAt).toLocaleTimeString("en-GB", { hour12: false })}
    </span>
  );
}
