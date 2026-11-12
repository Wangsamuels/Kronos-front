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
import { Notice } from "@/components/ui/Page";
import { Chevron, Gear, Lock, Refresh } from "@/components/ui/Icons";
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
        <div className="mt-6 grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="k-shimmer h-40 rounded-panel" />)}</div>
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

  const counts: Record<string, number> = {
    all: events.length,
    blocked: events.filter((e) => e.kind === "blocked").length,
    queued: events.filter((e) => e.kind === "queued").length,
    released: events.filter((e) => e.kind === "released").length,
    admin: events.filter((e) => e.kind.startsWith("admin_")).length,
  };

  return (
    <Frame name={p.name}>
      {/* 1 — header */}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-[clamp(2rem,2.4vw+1.25rem,3rem)] font-medium leading-[1.04] tracking-[-0.035em] text-text">{p.name}</h1>
            <ProtocolStatusPill status={p.status} stale={stale} />
          </div>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-13">
            {[
              ["chain", chainName(p.chainId)],
              ["guard", short(d?.guardAddress)],
              ...(d?.timelockAddress ? [["timelock", short(d.timelockAddress)]] : []),
              ...(pkg.data ? [["package", `v${pkg.data.version}`]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-2">
                <dt className="text-11 uppercase tracking-[0.06em] text-text-3">{k}</dt>
                <dd className="text-text-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onReanalyze} busy={reanalyze.isPending}>
            <Refresh className="size-3.5" />
            Re-analyze
          </Button>
          <ButtonLink href={`/p/${id}/settings`} variant="secondary">
            <Gear className="size-3.5" />
            Settings
          </ButtonLink>
        </div>
      </div>
      {p.status !== "live" && p.status !== "paused" ? (
        <Notice className="mt-6" word="not live">
          This guard is not live yet.{" "}
          <a className="k-link" href={`/p/${id}/verify`}>
            Finish onboarding
          </a>
        </Notice>
      ) : null}

      {/* 2 — stat tiles */}
      <div className="mt-10 grid gap-px overflow-hidden rounded-panel border border-line-2 bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Blocked" window="24h" value={stats24h.blocked} tone={stats24h.blocked ? "block" : undefined} series={hourly(events, (e) => e.kind === "blocked")} />
        <StatTile label="Outflow queued" window="now" value={outflowTotal} tone={outflowTotal ? "queue" : undefined} unit={queuedOutflow[0] ? assetUnit(queuedOutflow[0].asset) : undefined} series={hourly(events, (e) => e.kind === "queued", (e) => Number(e.amount) || 0)} />
        <StatTile label="Released" window="24h" value={stats24h.released} series={hourly(events, (e) => e.kind === "released")} />
        {attestation ? (
          <StatTile
            label="Attestation age"
            window={stale ? "stale" : "fresh"}
            value={attestation.ageSeconds}
            unit="s"
            tone={stale ? "block" : "pass"}
            foot={
              <ul className="grid gap-1.5 font-mono text-11 text-text-3">
                <li className="k-tnum">block {num(attestation.block)}</li>
                <li className="flex gap-4">
                  <span className={cn("flex items-center gap-1.5", attestation.oracleOk ? "text-pass" : "text-block")}>
                    <span aria-hidden className="block size-1.5 rounded-full bg-current" />
                    oracle {attestation.oracleOk ? "ok" : "fail"}
                  </span>
                  <span className={cn("flex items-center gap-1.5", attestation.solvencyOk ? "text-pass" : "text-block")}>
                    <span aria-hidden className="block size-1.5 rounded-full bg-current" />
                    solvency {attestation.solvencyOk ? "ok" : "fail"}
                  </span>
                </li>
              </ul>
            }
          />
        ) : (
          <div className="bg-surface p-5">
            <p className="text-13 text-text-2">Attestation age</p>
            <p className="mt-3 font-mono text-[40px] leading-none text-text-3">—</p>
            <p className="mt-6 font-mono text-11 text-block">no attestation yet · large outflows wait</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-end">
        <StaleNote updatedAt={ov.dataUpdatedAt} maxAgeMs={30_000} />
      </div>

      {/* 3 — needs attention (hidden when empty) */}
      {attention > 0 ? (
        <section className="mt-8 overflow-hidden rounded-panel border border-queue/40 bg-surface" aria-label="Needs attention">
          <header className="flex min-h-12 items-center justify-between gap-3 border-b border-queue/25 bg-queue/[0.06] px-4 md:px-5">
            <h2 className="flex items-center gap-2.5 text-15 font-medium text-text">
              <span aria-hidden className="block size-2 animate-k-pulse rounded-full bg-queue" />
              Needs attention
            </h2>
            <span className="k-tag k-tag-queue">{attention} waiting</span>
          </header>
          <div className="hidden min-h-10 grid-cols-12 items-center gap-3 border-b border-line px-5 md:grid">
            {["Type", "Action", "Proposer", "ETA", ""].map((h, i) => (
              <span key={i} className={cn("k-label", ["col-span-3", "col-span-3", "col-span-2", "col-span-2", "col-span-2"][i])}>
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
        </section>
      ) : null}

      {/* 4 — activity feed */}
      <section className="mt-8 overflow-hidden rounded-panel border border-line-2 bg-surface" aria-label="Activity">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 md:px-5">
          <h2 className="text-15 font-medium text-text">Activity</h2>
          <div role="group" aria-label="Filter by verdict" className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
            {CHIPS.map((c) => {
              const on = chip === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setChip(c.key)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-13 transition-colors duration-k",
                    on ? "border-text bg-text text-bg" : "border-line-2 text-text-2 hover:border-text-3 hover:text-text",
                  )}
                >
                  {c.label}
                  <span className={cn("k-tnum font-mono text-11", on ? "text-bg/70" : "text-text-3")}>{counts[c.key] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </header>
        <div className="hidden min-h-10 grid-cols-12 items-center gap-4 border-b border-line px-5 md:grid">
          {["Time", "Verdict", "Action", "Amount", "Invariant", "Tx"].map((h, i) => (
            <span key={h} className={cn("k-label col-span-2", i === 5 && "text-right")}>
              {h}
            </span>
          ))}
        </div>
        {feed.isLoading ? (
          <LoadingBlock lines={5} />
        ) : feed.isError ? (
          <ErrorState what="activity" error={feed.error} onRetry={() => feed.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={chip === "all" ? "Nothing yet" : `Nothing ${chip} in this window`}>Blocked, queued and released actions show up here within 10 seconds.</EmptyState>
        ) : (
          <ul aria-live="polite">{items.map((e) => <EventRow key={e.id} e={e} chainId={p.chainId} />)}</ul>
        )}
        <div className="flex justify-end border-t border-line px-5 py-2.5">
          <StaleNote updatedAt={feed.dataUpdatedAt} maxAgeMs={30_000} />
        </div>
      </section>

      {/* 5 — guard config (collapsed, read-only) */}
      <section className="mt-8 overflow-hidden rounded-panel border border-line-2 bg-surface">
        <button aria-expanded={showConfig} onClick={() => setShowConfig((s) => !s)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left transition-colors duration-k hover:bg-surface-2/50 md:px-5">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-15 font-medium text-text">Guard config</span>
            <span className="k-tag k-tag-idle">
              <Lock className="size-3" />
              read-only
            </span>
          </span>
          <Chevron className={cn("size-4 shrink-0 text-text-3 transition-transform duration-k", showConfig && "rotate-180")} />
        </button>
        {showConfig ? (
          <div className="grid gap-8 border-t border-line p-4 md:p-5">
            {results.isLoading ? (
              <LoadingBlock lines={4} className="p-0" />
            ) : results.isError ? (
              <ErrorState what="the guard config" error={results.error} onRetry={() => results.refetch()} />
            ) : results.data ? (
              <>
                <div>
                  <p className="k-label mb-3">Active invariants</p>
                  <ul className="overflow-hidden rounded-ctl border border-line font-mono text-13">
                    {results.data.invariants
                      .filter((i) => i.status === "approved")
                      .map((i) => (
                        <li key={i.id} className="grid gap-x-4 gap-y-1 border-b border-line px-4 py-2.5 last:border-b-0 md:grid-cols-[16rem_1fr]">
                          <span className="text-text">{i.template}</span>
                          <span className="break-words text-text-3">{Object.entries(i.params as Record<string, unknown>).map(([k, v]) => `${k}=${String(v)}`).join("  ") || "—"}</span>
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <p className="k-label mb-3">Intent schemas</p>
                  <ul className="flex flex-wrap gap-2">
                    {results.data.intentSchemas.map((s) => (
                      <li key={s.id} className="rounded-[4px] border border-line-2 bg-surface-2 px-2.5 py-1 font-mono text-13 text-text-2">
                        {(s.eip712 as { primaryType?: string } | null)?.primaryType ?? "Intent"}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="k-label mb-3">Timelock tiers</p>
                  <TierTable tiers={results.data.tiers} entries={new Map(results.data.entrypoints.map((e) => [e.id, e]))} locked onChange={() => {}} />
                </div>
                <p className="text-13 text-text-3">To change any of this, re-analyze. The pipeline reruns and you review the diff before anything ships.</p>
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
      <AppBar crumbs={[{ href: "/p", label: "Protocols" }, { label: name ?? "…" }]} />
      <main id="main" className="k-container pb-24 pt-10 md:pt-14">
        {children}
      </main>
    </div>
  );
}
