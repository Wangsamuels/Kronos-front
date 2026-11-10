import type { ProtocolEvent } from "@/api/types";
import { VerdictDot, verdictText } from "@/components/StatusPill";
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
  return (
    <li className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-line px-5 py-3 font-mono text-13 last:border-b-0 md:grid-cols-12 md:items-center">
      <span className="k-tnum text-text-3 md:col-span-2" title={e.ts}>
        {clockTime(e.ts)}
      </span>
      <span className={cn("flex items-center gap-2 md:col-span-2", verdictText(e.kind))}>
        <VerdictDot kind={e.kind} />
        {e.kind}
      </span>
      <span className="text-text md:col-span-2">{eventAction(e)}</span>
      <span className="k-tnum text-text md:col-span-2">{amount(e.amount, e.asset)}</span>
      <span className="truncate text-text md:col-span-2">{e.invariantId ?? "—"}</span>
      <span className="truncate text-text-3 md:col-span-2">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="hover:text-text hover:underline">
            {short(e.txHash, 6, 4)}
          </a>
        ) : (
          short(e.txHash)
        )}
      </span>
    </li>
  );
}
