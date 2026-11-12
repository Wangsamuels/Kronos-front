"use client";
import type { Monitor } from "@/api/types";
import { addressUrl, chainName } from "@/lib/chains";
import { short } from "@/lib/format";
import { nearAccountUrl } from "@/lib/links";
import { cn } from "@/lib/cn";
import { ArrowUpRight, Check, Cross, Lock } from "@/components/ui/Icons";

/** Wei -> "0.0040" (testnet gas token). Exact enough for a balance read-out. */
function gas(wei: string | null | undefined) {
  if (!wei || !/^\d+$/.test(wei)) return "—";
  const padded = wei.padStart(19, "0");
  const n = Number(`${padded.slice(0, -18)}.${padded.slice(-18, -12)}`);
  return n === 0 ? "0" : n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/**
 * Emergency controls: how the monitor can act on this protocol. One NEAR key, limited to `tighten`,
 * and the Chain Signatures address that NEAR's MPC network signs with on each EVM chain.
 */
export function EmergencyControls({ m, className }: { m: Monitor; className?: string }) {
  const cs = m.chainSignatures;
  const Ext = ({ href, children }: { href?: string; children: React.ReactNode }) =>
    href ? (
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 transition-colors duration-k hover:text-text">
        <span className="truncate">{children}</span>
        <ArrowUpRight className="size-3 shrink-0" />
      </a>
    ) : (
      <span className="truncate">{children}</span>
    );
  const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 font-mono text-11 uppercase tracking-[0.06em] text-text-3">{k}</dt>
      <dd className="flex min-w-0 justify-end font-mono text-13 text-text-2">{children}</dd>
    </div>
  );
  return (
    <section className={cn("overflow-hidden rounded-panel border border-line-2 bg-surface", className)} aria-label="Emergency controls">
      <header className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2 md:px-5">
        <h2 className="text-15 font-medium text-text">Emergency controls</h2>
        <span className="k-tag k-tag-pass">
          <Lock className="size-3" />
          key can call: tighten only
        </span>
      </header>
      <div className="grid gap-px bg-line lg:grid-cols-12">
        <div className="bg-surface p-4 md:p-5 lg:col-span-5">
          <p className="max-w-[34rem] text-15 text-text-2">The monitor can only make this protocol safer. Its NEAR key is limited to one action: tighten. It cannot raise a limit, and it cannot move funds.</p>
          <dl className="mt-4 divide-y divide-line/70 border-t border-line/70">
            <Row k={`NEAR registry · ${m.near.network}`}>
              <Ext href={nearAccountUrl(m.near.registry)}>{m.near.registry}</Ext>
            </Row>
            <Row k="Monitor account">{m.near.monitorAccount ? <Ext href={nearAccountUrl(m.near.monitorAccount)}>{m.near.monitorAccount}</Ext> : "not configured"}</Row>
            <Row k="Key scope">
              <span className={m.near.functionCallKey ? "text-pass" : "text-queue"}>{m.near.functionCallKey ? "function-call key · tighten" : "no function-call key"}</span>
            </Row>
            <Row k="MPC signer">{cs.enabled ? <Ext href={nearAccountUrl(cs.signer)}>{cs.signer}</Ext> : "Chain Signatures off"}</Row>
          </dl>
        </div>
        <div className="bg-surface p-4 md:p-5 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">Chain Signatures address</p>
            <p className="font-mono text-13 text-text" title={cs.evmAddress ?? undefined}>
              {cs.evmAddress ? short(cs.evmAddress, 10, 8) : "not derived"}
            </p>
          </div>
          <p className="mt-2 text-13 text-text-3">One NEAR key protects every chain. NEAR’s MPC network signs the outflow tighten with this address on each chain below; Kronos never holds an EVM key for it.</p>
          <ul className="mt-4 overflow-hidden rounded-ctl border border-line">
            {m.chains.length === 0 ? <li className="px-4 py-3 text-13 text-text-3">No deployment registered yet.</li> : null}
            {m.chains.map((c) => {
              const empty = c.usesChainSignatures && (!c.derivedAddressBalanceWei || /^0*$/.test(c.derivedAddressBalanceWei));
              return (
                <li key={c.chainId} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-b-0">
                  <span className="text-15 text-text">{chainName(c.chainId)}</span>
                  <span className={cn("k-tag justify-self-end", c.usesChainSignatures ? "k-tag-pass" : "k-tag-idle")}>
                    {c.usesChainSignatures ? <Check className="size-3" /> : <Cross className="size-3" />}
                    {c.usesChainSignatures ? "guard monitor = this address" : "guard uses a plain EVM monitor key"}
                  </span>
                  <span className="font-mono text-11 text-text-3">
                    guard{" "}
                    {addressUrl(c.chainId, c.guardAddress) ? (
                      <a href={addressUrl(c.chainId, c.guardAddress)} target="_blank" rel="noreferrer" className="text-text-2 transition-colors duration-k hover:text-text">
                        {short(c.guardAddress, 8, 6)}
                      </a>
                    ) : (
                      short(c.guardAddress, 8, 6)
                    )}
                  </span>
                  <span className={cn("k-tnum justify-self-end font-mono text-11", empty ? "text-queue" : "text-text-3")}>
                    {c.usesChainSignatures ? `gas ${gas(c.derivedAddressBalanceWei)}${empty ? " · needs funding to tighten" : ""}` : `monitor ${short(c.guardMonitor)}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-13 text-text-3">Chain Signatures covers outflow tightens. Pauses and cap changes are recorded on the NEAR registry and are not yet signed onto EVM chains.</p>
        </div>
      </div>
    </section>
  );
}
