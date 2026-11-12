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
import { ArrowUpRight, Check, Chevron, Cross, Gear, Lock, Refresh } from "@/components/ui/Icons";
import { EmptyState, ErrorState, LoadingBlock, StaleNote } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { qk, useAdminQueue, useEvents, useOverview, useReanalyze, useResults, useRunPackage } from "@/api/queries";
import { ApiError, errorMessage } from "@/api/errors";
import { USE_MOCKS } from "@/lib/env";
import { chainName } from "@/lib/chains";
import { duration, short, TIER_SHORT } from "@/lib/format";
import { formatAmount } from "@/lib/tokens";
import { addressUrl, txUrl } from "@/lib/chains";
import type { Attestation, ChainDeployment, VerifyCheck } from "@/api/types";
import { Tip } from "@/components/ui/Tip";
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

/** Attestations older than 10 minutes are shown in amber. */
const STALE_ATTESTATION_S = 600;

/** Is the guard live, what did it stop, and is anything waiting on me? Nothing else. */
export function Dashboard({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const ov = useOverview(id);
  const [chip, setChip] = useState<(typeof CHIPS)[number]["key"]>("all");
  const [chainFilter, setChainFilter] = useState<number | null>(null);
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

  const { protocol: p, stats24h, queuedOutflow, pendingAdminActions } = ov.data;
  // One card per chain: the latest deployment on each, joined with that chain's latest attestation.
  // (`deployment` / `attestation` still exist for compatibility but only carry the most recent one.)
  const deployments = ov.data.deployments?.length ? ov.data.deployments : ov.data.deployment ? [ov.data.deployment] : [];
  const attestations = ov.data.attestations?.length ? ov.data.attestations : ov.data.attestation ? [ov.data.attestation] : [];
  const chains = deployments.map((d) => ({ d, a: attestations.find((x) => x.chainId === d.chainId) }));
  const deploymentOn = (chainId: number | null | undefined) => deployments.find((x) => x.chainId === chainId) ?? deployments[0];
  const stale = p.status === "live" && chains.some((c) => c.d.verified && (!c.a || c.a.ageSeconds > STALE_ATTESTATION_S));
  const events = all.data?.items ?? [];
  const eventChains = [...new Set(events.map((e) => e.chainId).filter((c): c is number => typeof c === "number"))];
  const items = (feed.data?.items ?? [])
    .filter((e) => (chip === "admin" ? e.kind.startsWith("admin_") : true))
    .filter((e) => chainFilter === null || e.chainId === chainFilter);
  const queuedEvents = events.filter((e) => e.kind === "queued" && !(e.data as { released?: boolean } | null)?.released);
  const attention = (queue.data?.length ?? 0) + queuedEvents.length;

  const onReanalyze = async () => {
    try {
      await reanalyze.mutateAsync();
      await qc.invalidateQueries({ queryKey: qk.protocol(id) });
      router.push(`/p/${id}/analysis`);
    } catch (e) {
      // 409 with details.analysisId: one is already running. Open that one instead.
      if (e instanceof ApiError && e.status === 409 && (e.details as { analysisId?: string } | undefined)?.analysisId) {
        await qc.invalidateQueries({ queryKey: qk.protocol(id) });
        toast({ title: "Analysis already running", body: "Opening the one in progress.", tone: "queue" });
        router.push(`/p/${id}/analysis`);
        return;
      }
      toast({ title: "Couldn’t start re-analysis", body: errorMessage(e), tone: "block" });
    }
  };

  /** Guardian action: confirmation, then a wallet signature on-chain (simulated on the mock API). */
  const chainAction = async (kind: "cancel" | "release", target: { id: string; onchainId: bigint; chainId?: number | null }) => {
    const d = deploymentOn(target.chainId);
    const chainId = d?.chainId ?? p.chainId;
    try {
      let hash: string;
      if (USE_MOCKS) {
        const r = await fetch(`/__mock/chain/${kind}`, { method: "POST", body: JSON.stringify({ protocolId: id, id: target.id }), headers: { "content-type": "application/json" } });
        hash = ((await r.json()) as { txHash: string }).txHash;
      } else {
        const w = await import("@/lib/wallet/evm");
        if (kind === "cancel") {
          if (!d?.timelockAddress) throw new Error("No timelock address on the deployment");
          hash = await w.cancelTimelockAction(d.timelockAddress as Address, target.onchainId, chainId);
        } else {
          if (!d?.guardAddress) throw new Error("No guard address on the deployment");
          hash = await w.releaseOutflow(d.guardAddress as Address, target.onchainId, chainId);
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
              ["chains", chains.length ? chains.map((c) => chainName(c.d.chainId)).join(" + ") : chainName(p.chainId)],
              ...(pkg.data ? [["package", ver(pkg.data.version)]] : []),
              ...(pkg.data ? [["config", short(pkg.data.configHash, 10, 4)]] : []),
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

      {/* 2 — one card per chain: deployment + its latest attestation */}
      {chains.length ? (
        <div className={cn("mt-10 grid gap-4", chains.length > 1 && "lg:grid-cols-2")}>
          {chains.map(({ d, a }) => (
            <ChainCard key={d.id} d={d} a={a} staleAfter={STALE_ATTESTATION_S} />
          ))}
        </div>
      ) : (
        <Notice className="mt-10" word="no deployment" tone="idle">
          No guard is registered for this protocol yet.{" "}
          <a className="k-link" href={`/p/${id}/verify`}>
            Register a deployment
          </a>
        </Notice>
      )}

      {/* 3 — the last 24 hours */}
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line-2 bg-line md:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Blocked" window="24h" value={stats24h.blocked} tone={stats24h.blocked ? "block" : undefined} series={hourly(events, (e) => e.kind === "blocked")} />
        <StatTile label="Queued" window="24h" value={stats24h.queued} tone={stats24h.queued ? "queue" : undefined} series={hourly(events, (e) => e.kind === "queued")} />
        <StatTile label="Released" window="24h" value={stats24h.released} series={hourly(events, (e) => e.kind === "released")} />
        <StatTile label="Admin queued" window="24h" value={stats24h.adminQueued} tone={stats24h.adminQueued ? "queue" : undefined} series={hourly(events, (e) => e.kind === "admin_queued")} />
        <StatTile label="Alerts" window="24h" value={stats24h.alerts} tone={stats24h.alerts ? "block" : undefined} series={hourly(events, (e) => e.kind === "alert")} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-13 text-text-2">
          {queuedOutflow.length ? (
            queuedOutflow.map((q) => (
              <span key={q.asset}>
                <span className="text-11 uppercase tracking-[0.06em] text-text-3">in the outflow breaker </span>
                <span className="text-queue">{formatAmount(q.amount, q.asset)}</span>
                <span className="text-text-3">
                  {" "}
                  · {q.claims} claim{q.claims === 1 ? "" : "s"}
                </span>
              </span>
            ))
          ) : (
            <span className="text-text-3">Nothing waiting in the outflow breaker</span>
          )}
          {pendingAdminActions ? (
            <a href="#attention" className="k-link">
              {pendingAdminActions} admin action{pendingAdminActions === 1 ? "" : "s"} pending
            </a>
          ) : null}
        </p>
        <StaleNote updatedAt={ov.dataUpdatedAt} maxAgeMs={45_000} />
      </div>

      {/* 3 — needs attention (hidden when empty) */}
      {attention > 0 ? (
        <section id="attention" className="mt-8 scroll-mt-24 overflow-hidden rounded-panel border border-queue/40 bg-surface" aria-label="Needs attention">
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
                chain={deployments.length > 1 ? chainName(a.chainId) : undefined}
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
                onConfirm={() => chainAction("cancel", { id: a.id, onchainId: BigInt(a.actionId), chainId: a.chainId })}
              />
            ))}
            {queuedEvents.map((e) => {
              const data = (e.data ?? {}) as { claimId?: string; releaseAt?: string; function?: string };
              return (
                <QueueRow
                  key={e.id}
                  badge="Outflow queue"
                  chain={deployments.length > 1 && e.chainId ? chainName(e.chainId) : undefined}
                  action={`${data.function ?? "withdraw"} ${formatAmount(e.amount, e.asset)}`}
                  proposer={(e.data as { to?: string } | null)?.to ?? null}
                  eta={data.releaseAt ?? null}
                  etaPrefix="clears in "
                  actionLabel="Release"
                  danger={false}
                  confirmTitle="Release this queued outflow now?"
                  confirmBody={
                    <>
                      {formatAmount(e.amount, e.asset)} leaves the protocol before the window clears. Your guardian wallet signs{" "}
                      <span className="font-mono">releaseOutflow({data.claimId ?? "?"})</span>.
                    </>
                  }
                  onConfirm={() => chainAction("release", { id: e.id, onchainId: BigInt(data.claimId ?? 0), chainId: e.chainId })}
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
        {eventChains.length > 1 ? (
          <div role="group" aria-label="Filter by chain" className="flex items-center gap-1 overflow-x-auto border-b border-line px-4 py-2 md:px-5">
            <span className="k-label mr-2 shrink-0">Chain</span>
            {[null, ...eventChains].map((c) => {
              const on = chainFilter === c;
              return (
                <button
                  key={c ?? "all"}
                  onClick={() => setChainFilter(c)}
                  aria-pressed={on}
                  className={cn("h-7 shrink-0 rounded-[4px] border px-2 font-mono text-11 uppercase tracking-[0.06em] transition-colors duration-k", on ? "border-text-3 bg-surface-2 text-text" : "border-line text-text-3 hover:text-text")}
                >
                  {c === null ? "All chains" : chainName(c)}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="hidden min-h-10 grid-cols-12 items-center gap-4 border-b border-line px-5 md:grid">
          {["Time", "Verdict", "Action", "Amount", "Reason", "Tx"].map((h, i) => (
            <span key={h} className={cn("k-label", ["col-span-2", "col-span-2", "col-span-2", "col-span-2", "col-span-2", "col-span-2 text-right"][i])}>
              {h}
            </span>
          ))}
        </div>
        {feed.isLoading ? (
          <LoadingBlock lines={5} />
        ) : feed.isError ? (
          <ErrorState what="activity" error={feed.error} onRetry={() => feed.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={chip === "all" ? "Nothing yet" : `Nothing ${chip} in this window`}>Blocked, queued and released actions show up here within 15 seconds.</EmptyState>
        ) : (
          <ul aria-live="polite">{items.map((e) => <EventRow key={e.id} e={e} chainId={e.chainId ?? p.chainId} showChain />)}</ul>
        )}
        <div className="flex justify-end border-t border-line px-5 py-2.5">
          <StaleNote updatedAt={feed.dataUpdatedAt} maxAgeMs={45_000} />
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

/** One chain: guard and timelock linked to that chain's explorer, the verify result, and the attestation. */
function ChainCard({ d, a, staleAfter }: { d: ChainDeployment; a?: Attestation; staleAfter: number }) {
  const checks = (Array.isArray(d.checks) ? d.checks : []) as VerifyCheck[];
  const failed = checks.filter((c) => !c.ok);
  const old = !!a && a.ageSeconds > staleAfter;
  const Addr = ({ label, value }: { label: string; value: string | null }) => {
    const url = value ? addressUrl(d.chainId, value) : undefined;
    return (
      <div className="flex items-baseline justify-between gap-3">
        <dt className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">{label}</dt>
        <dd className="min-w-0 truncate font-mono text-13 text-text-2">
          {value && url ? (
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors duration-k hover:text-text" title={value}>
              {short(value, 8, 6)}
              <ArrowUpRight className="size-3 shrink-0" />
            </a>
          ) : (
            short(value)
          )}
        </dd>
      </div>
    );
  };
  return (
    <article className="overflow-hidden rounded-panel border border-line-2 bg-surface" aria-label={chainName(d.chainId)}>
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 md:px-5">
        <h2 className="flex items-baseline gap-2.5 text-17 font-medium text-text">
          {chainName(d.chainId)}
          <span className="k-tnum font-mono text-11 font-normal text-text-3">{d.chainId}</span>
        </h2>
        <Tip
          content={
            checks.length ? (
              <ul className="grid gap-1">
                {checks.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={c.ok ? "text-pass" : "text-block"}>{c.ok ? "pass" : "fail"}</span>
                    <span>{c.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              "No check details recorded for this deployment."
            )
          }
        >
          <span tabIndex={0} className={cn("k-tag cursor-default", d.verified ? "k-tag-pass" : "k-tag-block")}>
            {d.verified ? <Check className="size-3" /> : <Cross className="size-3" />}
            {d.verified ? `verified${checks.length ? ` · ${checks.length}/${checks.length}` : ""}` : `not verified${failed.length ? ` · ${failed.length} failed` : ""}`}
          </span>
        </Tip>
      </header>
      <div className="grid gap-px bg-line sm:grid-cols-2">
        <dl className="grid content-start gap-2.5 bg-surface p-4 md:p-5">
          <Addr label="guard" value={d.guardAddress} />
          <Addr label="timelock" value={d.timelockAddress} />
          {d.registryAddress ? <Addr label="registry" value={d.registryAddress} /> : null}
        </dl>
        <div className="bg-surface p-4 md:p-5">
          {a ? (
            <>
              <p className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">Attestation</p>
              <p className={cn("k-tnum mt-2 text-22 font-medium", old ? "text-queue" : "text-text")}>attested {ago(a.ageSeconds)}</p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-11">
                <li className={cn("flex items-center gap-1.5", a.oracleOk ? "text-pass" : "text-block")}>
                  <span aria-hidden className="block size-1.5 rounded-full bg-current" />
                  oracle {a.oracleOk ? "ok" : "fail"}
                </li>
                <li className={cn("flex items-center gap-1.5", a.solvencyOk ? "text-pass" : "text-block")}>
                  <span aria-hidden className="block size-1.5 rounded-full bg-current" />
                  solvency {a.solvencyOk ? "ok" : "fail"}
                </li>
                <li className="k-tnum text-text-3">block {a.block.toLocaleString("en-US")}</li>
                {a.postedTx && txUrl(d.chainId, a.postedTx) ? (
                  <li>
                    <a href={txUrl(d.chainId, a.postedTx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-text-3 transition-colors duration-k hover:text-text">
                      posted tx
                      <ArrowUpRight className="size-3" />
                    </a>
                  </li>
                ) : null}
              </ul>
              {old ? <p className="mt-3 text-13 text-queue">Older than 10 minutes. Large outflows wait until a fresh one lands.</p> : null}
            </>
          ) : (
            <>
              <p className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">Attestation</p>
              <p className="mt-2 text-22 font-medium text-text-3">none yet</p>
              <p className="mt-2 text-13 text-text-3">Large outflows wait until the first one lands.</p>
            </>
          )}
        </div>
      </div>
      {failed.length ? (
        <ul className="border-t border-line px-4 py-3 md:px-5">
          {failed.map((c, i) => (
            <li key={i} className="py-1 text-13 text-text-2">
              <span className="mr-2 font-mono text-11 uppercase text-block">failed</span>
              {c.name}
              {c.detail ? <span className="text-text-3"> · {c.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/** "42s ago", "2 min ago", "3h 05m ago" */
function ago(seconds: number) {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return `${duration(seconds)} ago`;
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

/** "1.0.0" and "v1-3be44e" both read as "v…". */
function ver(v: string) {
  return v.startsWith("v") ? v : `v${v}`;
}
