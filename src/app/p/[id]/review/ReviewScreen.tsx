"use client";
import * as Tabs from "@radix-ui/react-tabs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { InvariantCard } from "@/components/review/InvariantCard";
import { IntentCard } from "@/components/review/IntentCard";
import { TierTable } from "@/components/review/TierTable";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHead, StepEyebrow } from "@/components/ui/Page";
import { ArrowRight, Lock } from "@/components/ui/Icons";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useApprove, usePatchIntent, usePatchInvariant, usePatchTier, useProtocol, useResults } from "@/api/queries";
import { lastEventIdFor, openStream } from "@/api/stream";
import { ApiError, errorMessage } from "@/api/errors";
import type { Entrypoint } from "@/api/types";
import { num } from "@/lib/format";

export function ReviewScreen({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const protocol = useProtocol(id);
  const runId = protocol.data?.latestRunId ?? "";
  const results = useResults(runId || null);
  const patchInv = usePatchInvariant(runId);
  const patchIntent = usePatchIntent(runId);
  const patchTier = usePatchTier(runId);
  const approve = useApprove(runId, id);
  const [tab, setTab] = useState("invariants");
  const [needsDecision, setNeedsDecision] = useState<string[]>([]);

  const data = results.data;
  const locked = data ? data.run.status !== "review" : true;
  const entries = useMemo(() => new Map<string, Entrypoint>((data?.entrypoints ?? []).map((e) => [e.id, e])), [data]);
  const invariants = useMemo(() => [...(data?.invariants ?? [])].sort((a, b) => Number(b.needsReview) - Number(a.needsReview)), [data]);
  const undecided = invariants.filter((i) => i.needsReview && i.status === "proposed");
  const approvedCount = invariants.filter((i) => i.status !== "rejected").length;

  const onError = (e: unknown) => toast({ title: "Change not saved", body: errorMessage(e), tone: "block" });

  /**
   * Approve, then reopen the live log so the team can follow packaging. The first stream closed when
   * the run rested in `review`; a new EventSource cannot send Last-Event-ID, so openStream passes
   * ?lastEventId=<last id from the original analysis run> and the backend replays only what follows.
   */
  const onApprove = async () => {
    try {
      await approve.mutateAsync();
      const from = lastEventIdFor(runId);
      void openStream(runId, { resume: true });
      toast({ title: "approved · packaging", body: from ? `Following the live log after event #${from}.` : "Following the live log.", tone: "pass" });
      router.push(`/p/${id}/analysis`);
    } catch (e) {
      // 409 with details.invariantIds: flagged invariants still undecided. Take the reader to the first.
      const ids = e instanceof ApiError && e.status === 409 ? ((e.details as { invariantIds?: string[] } | undefined)?.invariantIds ?? []) : [];
      if (ids.length) {
        setNeedsDecision(ids);
        setTab("invariants");
        toast({ title: `${ids.length} invariant${ids.length > 1 ? "s" : ""} still need a decision`, body: "Approve or reject each highlighted rule, then approve again.", tone: "queue" });
        requestAnimationFrame(() => document.getElementById(`inv-card-${ids[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
        void results.refetch();
        return;
      }
      if (e instanceof ApiError && e.status === 409) {
        // "At least one invariant must be approved", "Run already approved"
        toast({ title: "Can’t approve yet", body: e.message, tone: "queue" });
        void results.refetch();
        void protocol.refetch();
        return;
      }
      toast({ title: "Approval failed", body: errorMessage(e), tone: "block" });
    }
  };

  const shell = (children: React.ReactNode) => (
    <OnboardingShell step="review" protocolId={id} wide>
      {children}
    </OnboardingShell>
  );
  if (protocol.isLoading || (runId && results.isLoading)) return shell(<LoadingBlock lines={10} />);
  if (protocol.isError) return shell(<ErrorState what="this protocol" error={protocol.error} onRetry={() => protocol.refetch()} />);
  if (!runId) return shell(<EmptyState title="Nothing to review yet" action={<ButtonLink href={`/p/${id}/analysis`}>Open analysis</ButtonLink>}>No analysis has run for this protocol.</EmptyState>);
  if (results.isError) return shell(<ErrorState what="the analysis results" error={results.error} onRetry={() => results.refetch()} />);
  if (!data) return shell(null);
  if (data.run.status === "running" || data.run.status === "queued")
    return shell(<EmptyState title="Still analyzing" action={<ButtonLink href={`/p/${id}/analysis`}>Watch the live log</ButtonLink>}>Review opens as soon as the run finishes.</EmptyState>);

  const tr = data.testReport;
  const gas = (tr?.gas ?? {}) as Record<string, { plain?: number | null; guarded?: number | null; overhead?: number | null } | unknown>;
  const gasRows = Object.entries(gas).filter(([, v]) => v && typeof v === "object" && "overhead" in (v as object)) as [string, { plain?: number | null; guarded?: number | null; overhead?: number | null }][];

  const decided = invariants.filter((i) => i.status !== "proposed").length;
  const flaggedTotal = invariants.filter((i) => i.needsReview).length;
  const maxGas = Math.max(1, ...gasRows.map(([, v]) => v.overhead ?? 0));
  const allBlocked = !!tr && tr.attacksBlocked === tr.attacksTotal;

  return shell(
    <>
      <PageHead
        eyebrow={<StepEyebrow n={3} label="Review" />}
        title="Review what the guard will enforce"
        lede="Nothing ships until you approve it. Rules the two drafters disagreed on are pinned to the top and need a decision."
        right={
          locked ? (
            <ButtonLink href={`/p/${id}/analysis`} variant="secondary">
              <Lock className="size-3.5" />
              Review locked · follow packaging
              <ArrowRight />
            </ButtonLink>
          ) : null
        }
      />

      {/* Banner: test report + gas overhead per entry point */}
      <section aria-label="Test report" className="mt-8 grid gap-px overflow-hidden rounded-panel border border-line-2 bg-line lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-px bg-line lg:col-span-7 lg:grid-cols-3">
          <div className="bg-surface p-5">
            <p className="text-13 text-text-2">Attacks blocked</p>
            <p className={`k-tnum mt-2 font-mono text-32 leading-none ${allBlocked ? "text-pass" : "text-block"}`}>
              {tr?.attacksBlocked ?? 0}
              <span className="text-text-3">/{tr?.attacksTotal ?? 0}</span>
            </p>
            <p className="mt-2 font-mono text-11 text-text-3">replayed on a fork</p>
          </div>
          <div className="bg-surface p-5">
            <p className="text-13 text-text-2">Normal txs passed</p>
            <p className="k-tnum mt-2 font-mono text-32 leading-none text-text">
              {num(tr?.normalPass)}
              <span className="text-text-3">/{num(tr?.normalTxCount)}</span>
            </p>
            <p className="mt-2 font-mono text-11 text-text-3">no false positives wanted</p>
          </div>
          <div className="col-span-2 bg-surface p-5 lg:col-span-1">
            <p className="text-13 text-text-2">Entry points guarded</p>
            <p className="k-tnum mt-2 font-mono text-32 leading-none text-text">{data.entrypoints.length}</p>
            <p className="mt-2 font-mono text-11 text-text-3">user and privileged</p>
          </div>
        </div>
        <div className="bg-surface p-5 lg:col-span-5">
          <p className="text-13 text-text-2">Gas overhead per entry point</p>
          {gasRows.length ? (
            <ul className="mt-3 grid gap-1.5 font-mono text-13">
              {gasRows.map(([k, v]) => (
                <li key={k} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3">
                  <span className="truncate text-text-2">{k}</span>
                  <span aria-hidden className="h-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-text-3" style={{ width: `${Math.max(4, ((v.overhead ?? 0) / maxGas) * 100)}%` }} />
                  </span>
                  <span className="k-tnum text-right text-text">+{num(v.overhead)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-13 text-text-3">No gas measurements in this report.</p>
          )}
        </div>
      </section>

      <Tabs.Root value={tab} onValueChange={setTab} className="mt-10">
        <Tabs.List aria-label="Review sections" className="flex gap-1 overflow-x-auto border-b border-line">
          {[
            ["invariants", "Invariants", invariants.length, undecided.length ? `${undecided.length} to decide` : null],
            ["intents", "Intents", data.intentSchemas.length, null],
            ["tiers", "Admin tiers", data.tiers.length, null],
          ].map(([v, label, count, badge]) => (
            <Tabs.Trigger
              key={v as string}
              value={v as string}
              className="group -mb-px flex h-12 shrink-0 items-center gap-2.5 whitespace-nowrap border-b-2 border-transparent px-1 pr-5 text-15 text-text-2 transition-colors duration-k hover:text-text data-[state=active]:border-text data-[state=active]:font-medium data-[state=active]:text-text"
            >
              {label}
              <span className="k-tnum rounded-[4px] border border-line-2 bg-surface-2 px-1.5 font-mono text-11 font-normal text-text-2">{count}</span>
              {badge ? <span className="k-tag k-tag-queue font-normal">{badge}</span> : null}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="invariants" className="mt-6 grid gap-4 focus-visible:outline-none">
          {invariants.length === 0 ? (
            <div className="rounded-panel border border-line-2 bg-surface">
              <EmptyState title="No invariants were drafted">Check that the repo compiles, then re-analyze.</EmptyState>
            </div>
          ) : null}
          {invariants.map((inv) => (
            <InvariantCard
              key={`${inv.id}-${JSON.stringify(inv.params)}`}
              inv={inv}
              highlight={needsDecision.includes(inv.id) && inv.status === "proposed"}
              locked={locked}
              busy={patchInv.isPending && patchInv.variables?.id === inv.id}
              onDecide={(status) => patchInv.mutate({ id: inv.id, status }, { onError })}
              onSaveParams={(params) => patchInv.mutate({ id: inv.id, params }, { onError })}
            />
          ))}
        </Tabs.Content>

        <Tabs.Content value="intents" className="mt-6 grid gap-4 focus-visible:outline-none">
          {data.intentSchemas.length === 0 ? (
            <div className="rounded-panel border border-line-2 bg-surface">
              <EmptyState title="No intents">No user entry points were found, so there is nothing for users to sign.</EmptyState>
            </div>
          ) : null}
          {data.intentSchemas.map((s) => (
            <IntentCard
              key={`${s.id}-${JSON.stringify(s.bounds)}`}
              schema={s}
              entry={entries.get(s.entrypointId)}
              locked={locked}
              busy={patchIntent.isPending}
              onSave={(bounds) => patchIntent.mutate({ id: s.id, bounds }, { onError })}
              onDecide={(status) => patchIntent.mutate({ id: s.id, status }, { onError })}
            />
          ))}
        </Tabs.Content>

        <Tabs.Content value="tiers" className="mt-6 focus-visible:outline-none">
          {data.tiers.length === 0 ? (
            <div className="rounded-panel border border-line-2 bg-surface">
              <EmptyState title="No privileged functions">Nothing in this protocol is access-controlled, so there is nothing to timelock.</EmptyState>
            </div>
          ) : (
            <TierTable tiers={data.tiers} entries={entries} locked={locked} onChange={(t, tier) =>
                patchTier.mutate(
                  { id: t.id, tier },
                  {
                    onError: (e) =>
                      e instanceof ApiError && e.status === 409
                        ? toast({ title: "This tier is a hard rule", body: `${e.message}. It can be raised, never lowered.`, tone: "queue" })
                        : onError(e),
                  },
                )
              } />
          )}
          <p className="mt-4 max-w-[44rem] text-13 text-text-3">Safer is instant, riskier waits: Tier 0 instant (tighten only), Tier 1 48 hours, Tier 2 7 days, Tier 3 14 days plus an independent co-sign. Hard rules can only be made stricter.</p>
        </Tabs.Content>
      </Tabs.Root>

      {!locked ? (
        <div className="sticky bottom-4 z-20 mt-10">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-panel border border-line-2 bg-surface/95 p-3 pl-5 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.9)] backdrop-blur">
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-15 font-medium text-text" aria-live="polite">
                {undecided.length > 0 ? `${undecided.length} flagged invariant${undecided.length > 1 ? "s" : ""} still need${undecided.length > 1 ? "" : "s"} a decision` : "Ready to build the guard"}
              </p>
              <p className="mt-0.5 text-13 text-text-3">
                {undecided.length > 0
                  ? `${flaggedTotal - undecided.length} of ${flaggedTotal} flagged decided · ${decided} of ${invariants.length} invariants decided`
                  : "Approving locks the review. Anything left as proposed is approved as proposed."}
              </p>
            </div>
            <Button size="lg" onClick={onApprove} disabled={undecided.length > 0 || approvedCount === 0} busy={approve.isPending} className="w-full min-[520px]:w-auto">
              Approve and build guard
              <ArrowRight />
            </Button>
          </div>
        </div>
      ) : null}
    </>,
  );
}
