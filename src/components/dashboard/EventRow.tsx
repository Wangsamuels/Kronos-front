import type { ProtocolEvent } from "@/api/types";
import { ArrowUpRight } from "@/components/ui/Icons";
import { nearTxUrl } from "@/lib/links";
import { chainName, txUrl } from "@/lib/chains";

/** "Aurora testnet" -> "Aurora", "Base Sepolia" -> "Base": the chip on each activity row. */
const chainShort = (id: number) => chainName(id).split(" ")[0] ?? String(id);
import { clockTime, short } from "@/lib/format";
import { formatAmount } from "@/lib/tokens";
import { cn } from "@/lib/cn";

export function eventAction(e: ProtocolEvent) {
  const d = (e.data ?? {}) as Record<string, unknown>;
  const fn = (d.function ?? d.functionName) as string | undefined;
  return fn ? fn.replace(/\(.*$/, "") : e.kind === "alert" ? String(d.title ?? "alert") : "—";
}

/** Activity feed row: time, verdict dot + word, action, amount, invariant, tx link to the explorer. */
export function EventRow({ e, chainId, showChain, mpcAddress }: { e: ProtocolEvent; chainId: number; showChain?: boolean; mpcAddress?: string | null }) {
  const d = (e.data ?? {}) as { reason?: string; message?: string; error?: string; via?: string; nearTx?: string; evmTx?: string; signer?: string; by?: string; near?: { tx?: string } | null };
  // A tighten is "signed by NEAR MPC" when the worker says it went through Chain Signatures, or when
  // the on-chain sender is this protocol's Chain Signatures address.
  const sender = d.signer ?? d.by;
  const mpc = e.kind === "tightened" && (d.via === "chain-signatures" || (!!mpcAddress && !!sender && sender.toLowerCase() === mpcAddress.toLowerCase()));
  const nearTx = e.kind === "tightened" ? (d.nearTx ?? d.near?.tx) : undefined;
  const evmTx = d.evmTx ?? e.txHash;
  const evmUrl = evmTx && /^0x/.test(evmTx) ? txUrl(chainId, evmTx) : undefined;
  // The line: the invariant that fired, then why (data.reason or data.message).
  const t = (e.data ?? {}) as { from?: string; to?: string; oldThreshold?: string; newThreshold?: string };
  const before = t.from ?? t.oldThreshold;
  const after = t.to ?? t.newThreshold;
  // A tighten reads as "limit 200,000 → 100,000"; everything else as the invariant that fired and why.
  const change = e.kind === "tightened" && before && after ? `limit ${formatAmount(before, e.asset).replace(/ base units of .*$/, "")} → ${formatAmount(after, e.asset)}` : null;
  const why = [change ?? e.invariantId, d.reason ?? d.message ?? d.error].filter(Boolean).join(" · ") || "—";
  const url = e.txHash ? txUrl(chainId, e.txHash) : undefined;
  const tag =
    e.kind === "blocked" || e.kind === "alert" ? "k-tag-block" : e.kind.includes("queued") || e.kind === "tightened" ? "k-tag-queue" : e.kind === "released" || e.kind === "admin_cancelled" || e.kind === "admin_executed" ? "k-tag-pass" : "k-tag-idle";
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-3.5 font-mono text-13 transition-colors duration-k last:border-b-0 hover:bg-surface-2/40 md:grid-cols-12 md:gap-x-4 md:px-5 md:py-3">
      <span className="k-tnum order-3 text-right text-text-3 md:order-none md:col-span-2 md:text-left" title={e.ts}>
        {clockTime(e.ts)}
      </span>
      <span className="order-1 flex items-center gap-2 md:order-none md:col-span-2">
        <span className={cn("k-tag", tag)}>{e.kind.replace("_", " ")}</span>
        {showChain ? <span className="rounded-[4px] border border-line px-1.5 text-[10px] uppercase leading-5 tracking-[0.04em] text-text-3 min-[520px]:hidden">{chainShort(chainId)}</span> : null}
      </span>
      <span className="order-2 truncate text-text md:order-none md:col-span-2">{e.kind === "tightened" && eventAction(e) === "—" ? "tightenOutflow" : eventAction(e)}</span>
      <span className="k-tnum order-4 col-span-3 text-text md:order-none md:col-span-2">{formatAmount(e.amount, e.asset)}</span>
      <span className="order-5 col-span-2 truncate text-text-2 md:order-none md:col-span-2" title={why}>
        {why}
      </span>
      {e.kind === "tightened" && (mpc || nearTx) ? (
        <span className="order-7 col-span-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-11 text-text-3 md:order-none md:col-span-12 md:pl-[calc(16.666%+0.5rem)]">
          {mpc ? <span className="k-tag k-tag-pass">signed by NEAR MPC</span> : <span className="k-tag k-tag-idle">monitor key</span>}
          {nearTx ? (
            <a href={nearTxUrl(nearTx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors duration-k hover:text-text">
              NEAR tx {short(nearTx, 6, 4)}
              <ArrowUpRight className="size-3" />
            </a>
          ) : null}
          {evmUrl ? (
            <a href={evmUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors duration-k hover:text-text">
              {chainName(chainId)} tx {short(evmTx, 6, 4)}
              <ArrowUpRight className="size-3" />
            </a>
          ) : null}
        </span>
      ) : null}
      <span className="order-6 flex items-center justify-end gap-2 truncate text-text-3 md:order-none md:col-span-2">
        {showChain ? <span className="hidden rounded-[4px] border border-line px-1.5 text-[10px] uppercase leading-5 tracking-[0.04em] text-text-3 min-[520px]:inline">{chainShort(chainId)}</span> : null}
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
