"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { AppBar } from "@/components/SiteNav";
import { ProtocolStatusPill } from "@/components/StatusPill";
import { StatTile } from "@/components/dashboard/StatTile";
import { EventRow } from "@/components/dashboard/EventRow";
import { QueueRow } from "@/components/dashboard/QueueRow";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Section";
import { EmptyState, ErrorState, LoadingBlock, StaleNote } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { qk, useAdminQueue, useEvents, useOverview, useReanalyze, useResults, useRunPackage } from "@/api/queries";
import { errorMessage } from "@/api/errors";
import { USE_MOCKS } from "@/lib/env";
import { chainName } from "@/lib/chains";
import { amount, num, short, TIER_SHORT } from "@/lib/format";
import { hourly } from "@/lib/series";
import { cn } from "@/lib/cn";
import { TierTable } from "@/components/review/TierTable";

const CHIPS = [
  { key: "all", label: "All" },
  { key: "blocked", label: "Blocked" },
  { key: "queued", label: "Queued" },
  { key: "released", label: "Released" },
  { key: "admin", label: "Admin" },
] as const;

const STALE_ATTESTATION_S = 300;

/** Is the guard live, what did it stop, and is anything waiting on me? Nothing else. */
export function Dashboard({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const ov = useOverview(id);
  const [chip, setChip] = useState<(typeof CHIPS)[number]["key"]>("all");
  const serverKind = chip === "all" || chip === "admin" ? undefined : chip;
  const feed = useEvents(id, serverKind);
  const all = useEvents(id); // unfiltered, for sparklines and the outflow queue
  const queue = useAdminQueue(id);
  const runId = ov.data?.protocol.latestRunId;
  const pkg = useRunPackage(runId);
  const reanalyze = useReanalyze(id);
  const [showConfig, setShowConfig] = useState(false);
  const results = useResults(showConfig ? runId : null);

  if (ov.isLoading)
    return (
      <Frame>
        <LoadingBlock lines={3} />
        <div className="mt-6 grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="k-panel h-36 animate-pulse bg-surface" />)}</div>
      </Frame>
    );
  if (ov.isError || !ov.data)
    return (
      <Frame>
        <ErrorState what="the dashboard" error={ov.error} onRetry={() => ov.refetch()} />
      </Frame>
    );

  const { protocol: p, deployment: d, stats24h, attestation, queuedOutflow } = ov.data;
  const stale = !attestation || attestation.ageSeconds > STALE_ATTESTATION_S;
  const events = all.data?.items ?? [];
  const items = (feed.data?.items ?? []).filter((e) => (chip === "admin" ? e.kind.startsWith("admin_") : true));
  const queuedEvents = events.filter((e) => e.kind === "queued" && !(e.data as { released?: boolean } | null)?.released);
  const outflowTotal = queuedOutflow.reduce((s, q) => s + (Number(q.amount) || 0), 0);
  const attention = (queue.data?.length ?? 0) + queuedEvents.length;

  const onReanalyze = async () => {
    try {
      await reanalyze.mutateAsync();
      await qc.invalidateQueries({ queryKey: qk.protocol(id) });
      router.push(`/p/${id}/analysis`);
    } catch (e) {
      toast({ title: "Couldn’t start re-analysis", body: errorMessage(e), tone: "block" });
    }
  };

  /** Guardian action: confirmation, then a wallet signature on-chain (simulated on the mock API). */
  const chainAction = async (kind: "cancel" | "release", target: { id: string; onchainId: bigint }) => {
    try {
      let hash: string;
      if (USE_MOCKS) {
        const r = await fetch(`/__mock/chain/${kind}`, { method: "POST", body: JSON.stringify({ protocolId: id, id: target.id }), headers: { "content-type": "application/json" } });
        hash = ((await r.json()) as { txHash: string }).txHash;
      } else {
        const w = await import("@/lib/wallet/evm");
        if (kind === "cancel") {
          if (!d?.timelockAddress) throw new Error("No timelock address on the deployment");
          hash = await w.cancelTimelockAction(d.timelockAddress as Address, target.onchainId, p.chainId);
        } else {
          if (!d?.guardAddress) throw new Error("No guard address on the deployment");
          hash = await w.releaseOutflow(d.guardAddress as Address, target.onchainId, p.chainId);
        }
      }
      toast({ title: kind === "cancel" ? "cancelled" : "released", body: `tx ${short(hash)} · the monitor will record it`, tone: kind === "cancel" ? "block" : "pass" });
      void qc.invalidateQueries({ queryKey: qk.adminQueue(id) });
      void qc.invalidateQueries({ queryKey: ["events", id] });
      void qc.invalidateQueries({ queryKey: qk.overview(id) });
    } catch (e) {
      toast({ title: "Transaction not sent", body: errorMessage(e), tone: "block" });
      throw e;
    }
  };

  return (
    <Frame name={p.name}>
      {/* 1 — header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-44 font-medium">{p.name}</h1>
            <ProtocolStatusPill status={p.status} stale={stale} />
          </div>
          <p className="mt-2 font-mono text-13 text-text-3">
            {chainName(p.chainId)} · guard {short(d?.guardAddress)}
            {d?.timelockAddress ? ` · timelock ${short(d.timelockAddress)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-13 text-text-3">{pkg.data ? `v${pkg.data.version}` : ""}</span>
          <Button variant="secondary" size="sm" onClick={onReanalyze} busy={reanalyze.isPending}>
            Re-analyze
          </Button>
          <ButtonLink href={`/p/${id}/settings`} variant="secondary" size="sm">
            Settings
          </ButtonLink>
        </div>
      </div>
      {p.status !== "live" && p.status !== "paused" ? (
        <p className="mt-4 rounded-ctl border border-line bg-surface px-4 py-3 text-15 text-text-2">
          <span className="mr-2 font-mono text-13 text-queue/90">not live</span>This guard is not live yet. <a className="text-text underline" href={`/p/${id}/verify`}>Finish onboarding →</a>
        </p>
      ) : null}

      {/* 2 — stat tiles */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Blocked · 24h" value={stats24h.blocked} tone={stats24h.blocked ? "block" : undefined} series={hourly(events, (e) => e.kind === "blocked")} />
        <StatTile label="Outflow queued now" value={outflowTotal} tone={outflowTotal ? "queue" : undefined} unit={queuedOutflow[0] ? assetUnit(queuedOutflow[0].asset) : undefined} series={hourly(events, (e) => e.kind === "queued", (e) => Number(e.amount) || 0)} />
        <StatTile label="Released · 24h" value={stats24h.released} series={hourly(events, (e) => e.kind === "released")} />
        {attestation ? (
          <StatTile
            label="Attestation age"
            value={attestation.ageSeconds}
            unit="s"
            tone={stale ? "block" : "pass"}
            foot={
              <p className="font-mono text-11 text-text-3">
                block {num(attestation.block)} · <span className={attestation.oracleOk ? "text-pass" : "text-block"}>oracle {attestation.oracleOk ? "ok" : "fail"}</span> ·{" "}
                <span className={attestation.solvencyOk ? "text-pass" : "text-block"}>solvency {attestation.solvencyOk ? "ok" : "fail"}</span>
              </p>
            }
          />
        ) : (
          <div className="k-panel p-5">
            <p className="k-label">Attestation age</p>
            <p className="mt-3 text-32 text-text-3">—</p>
            <p className="mt-4 font-mono text-11 text-block">no attestation yet · large outflows wait</p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <StaleNote updatedAt={ov.dataUpdatedAt} maxAgeMs={30_000} />
      </div>

      {/* 3 — needs attention (hidden when empty) */}
      {attention > 0 ? (
        <Panel className="mt-6" label="Needs attention" right={<span className="font-mono text-13 text-queue">{attention} waiting</span>}>
          <div className="hidden grid-cols-12 gap-3 border-b border-line px-5 py-2 md:grid">
            {["Tier", "Action", "Proposer", "ETA", ""].map((h, i) => (
              <span key={i} className={cn("k-label", ["col-span-3", "col-span-4", "col-span-2", "col-span-2", "col-span-1"][i])}>
                {h}
              </span>
            ))}
          </div>
          <ul>
            {(queue.data ?? []).map((a) => (
              <QueueRow
                key={a.id}
                badge={`Tier ${a.tier} · ${TIER_SHORT[a.tier] ?? ""}`}
                action={a.functionName ?? a.selector}
                proposer={a.proposer}
                eta={a.eta}
                actionLabel="Cancel"
                confirmTitle="Cancel this timelocked change?"
                confirmBody={
                  <>
                    <span className="font-mono text-text">{a.functionName ?? a.selector}</span> (action #{a.actionId}) will never execute. Your guardian wallet signs{" "}
                    <span className="font-mono">GuardTimelock.cancel({a.actionId})</span>.
                  </>
                }
                onConfirm={() => chainAction("cancel", { id: a.id, onchainId: BigInt(a.actionId) })}
              />
            ))}
            {queuedEvents.map((e) => {
              const data = (e.data ?? {}) as { claimId?: string; releaseAt?: string; function?: string };
              return (
                <QueueRow
                  key={e.id}
                  badge="Outflow queue"
                  action={`${data.function ?? "withdraw"} ${amount(e.amount, e.asset)}`}
                  proposer={(e.data as { to?: string } | null)?.to ?? null}
                  eta={data.releaseAt ?? null}
                  etaPrefix="clears in "
                  actionLabel="Release"
                  danger={false}
                  confirmTitle="Release this queued outflow now?"
                  confirmBody={
                    <>
                      {amount(e.amount, e.asset)} leaves the protocol before the window clears. Your guardian wallet signs{" "}
                      <span className="font-mono">releaseOutflow({data.claimId ?? "?"})</span>.
                    </>
                  }
                  onConfirm={() => chainAction("release", { id: e.id, onchainId: BigInt(data.claimId ?? 0) })}
                />
              );
            })}
          </ul>
        </Panel>
      ) : null}

      {/* 4 — activity feed */}
      <Panel
        className="mt-6"
        label="Activity"
        right={
          <div role="group" aria-label="Filter by verdict" className="flex flex-wrap gap-1">
            {CHIPS.map((c) => (
              <button
                key={c.key}
                onClick={() => setChip(c.key)}
                aria-pressed={chip === c.key}
                className={cn("h-8 rounded-ctl border px-2.5 font-mono text-11 uppercase tracking-[0.06em]", chip === c.key ? "border-text-3 bg-surface-2 text-text" : "border-line text-text-3 hover:text-text")}
              >
                {c.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="hidden grid-cols-12 gap-4 border-b border-line px-5 py-2 md:grid">
          {["Time", "Verdict", "Action", "Amount", "Invariant", "Tx"].map((h) => (
            <span key={h} className="k-label col-span-2">
              {h}
            </span>
          ))}
        </div>
        {feed.isLoading ? (
          <LoadingBlock lines={5} />
        ) : feed.isError ? (
          <ErrorState what="activity" error={feed.error} onRetry={() => feed.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState>Nothing {chip === "all" ? "" : `${chip} `}in this window. Blocked, queued and released actions show up here within 10 seconds.</EmptyState>
        ) : (
          <ul aria-live="polite">{items.map((e) => <EventRow key={e.id} e={e} chainId={p.chainId} />)}</ul>
        )}
        <div className="flex justify-end border-t border-line px-5 py-2">
          <StaleNote updatedAt={feed.dataUpdatedAt} maxAgeMs={30_000} />
        </div>
      </Panel>

      {/* 5 — guard config (collapsed, read-only) */}
      <section className="k-panel mt-6">
        <button aria-expanded={showConfig} onClick={() => setShowConfig((s) => !s)} className="flex w-full items-center justify-between px-5 py-4 text-left">
          <span className="k-label">Guard config · read-only</span>
          <span className="font-mono text-13 text-text-3">{showConfig ? "− collapse" : "+ expand"}</span>
        </button>
        {showConfig ? (
          <div className="grid gap-6 border-t border-line p-5">
            {results.isLoading ? (
              <LoadingBlock lines={4} className="p-0" />
            ) : results.isError ? (
              <ErrorState what="the guard config" error={results.error} onRetry={() => results.refetch()} />
            ) : results.data ? (
              <>
                <div>
                  <p className="k-label mb-2">Active invariants</p>
                  <ul className="grid gap-1 font-mono text-13">
                    {results.data.invariants
                      .filter((i) => i.status === "approved")
                      .map((i) => (
                        <li key={i.id} className="flex flex-wrap gap-x-3">
                          <span className="text-text">{i.template}</span>
                          <span className="text-text-3">{Object.entries(i.params as Record<string, unknown>).map(([k, v]) => `${k}=${String(v)}`).join(" ") || "—"}</span>
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <p className="k-label mb-2">Intent schemas</p>
                  <p className="font-mono text-13 text-text-2">
                    {results.data.intentSchemas.map((s) => ((s.eip712 as { primaryType?: string } | null)?.primaryType ?? "Intent")).join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="k-label mb-2">Timelock tiers</p>
                  <TierTable tiers={results.data.tiers} entries={new Map(results.data.entrypoints.map((e) => [e.id, e]))} locked onChange={() => {}} />
                </div>
                <p className="text-13 text-text-3">Changing any of this means Re-analyze: the pipeline reruns and you review the diff.</p>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </Frame>
  );
}

function assetUnit(asset: string) {
  const known: Record<string, string> = { "0x036cbd53842c5426634e7929541ec2318f3dcf7e": "USDC", "0x4200000000000000000000000000000000000006": "WETH" };
  return known[asset.toLowerCase()] ?? short(asset);
}

function Frame({ children, name }: { children: React.ReactNode; name?: string }) {
  return (
    <div className="min-h-dvh">
      <AppBar crumbs={[{ href: "/p", label: "Protocols" }, { label: name ?? "…" }]} right={<ButtonLink href="/p" variant="secondary" size="sm">All protocols</ButtonLink>} />
      <main id="main" className="k-container py-10">
        {children}
      </main>
    </div>
  );
}
