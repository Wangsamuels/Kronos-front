import type { ProtocolEvent } from "@/api/types";
import { ArrowUpRight } from "@/components/ui/Icons";
import { txUrl } from "@/lib/chains";
import { amount, clockTime, short } from "@/lib/format";
import { cn } from "@/lib/cn";

export function eventAction(e: ProtocolEvent) {
  const d = (e.data ?? {}) as Record<string, unknown>;
  const fn = (d.function ?? d.functionName) as string | undefined;
  return fn ? fn.replace(/\(.*$/, "") : e.kind === "alert" ? String(d.title ?? "alert") : "—";
}

/** Activity feed row: time, verdict dot + word, action, amount, invariant, tx link to the explorer. */
export function EventRow({ e, chainId }: { e: ProtocolEvent; chainId: number }) {
  const url = e.txHash ? txUrl(chainId, e.txHash) : undefined;
  const tag = e.kind === "blocked" || e.kind === "alert" ? "k-tag-block" : e.kind.includes("queued") ? "k-tag-queue" : e.kind === "released" || e.kind === "admin_cancelled" || e.kind === "admin_executed" ? "k-tag-pass" : "k-tag-idle";
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-3.5 font-mono text-13 transition-colors duration-k last:border-b-0 hover:bg-surface-2/40 md:grid-cols-12 md:gap-x-4 md:px-5 md:py-3">
      <span className="k-tnum order-3 text-right text-text-3 md:order-none md:col-span-2 md:text-left" title={e.ts}>
        {clockTime(e.ts)}
      </span>
      <span className="order-1 md:order-none md:col-span-2">
        <span className={cn("k-tag", tag)}>{e.kind.replace("_", " ")}</span>
      </span>
      <span className="order-2 truncate text-text md:order-none md:col-span-2">{eventAction(e)}</span>
      <span className="k-tnum order-4 col-span-3 text-text md:order-none md:col-span-2">{amount(e.amount, e.asset)}</span>
      <span className="order-5 col-span-2 truncate text-text-2 md:order-none md:col-span-2">{e.invariantId ?? "—"}</span>
      <span className="order-6 truncate text-right text-text-3 md:order-none md:col-span-2">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors duration-k hover:text-text">
            {short(e.txHash, 6, 4)}
            <ArrowUpRight className="size-3" />
          </a>
        ) : (
          short(e.txHash)
        )}
      </span>
    </li>
  );
}
