"use client";
import * as Tabs from "@radix-ui/react-tabs";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { InvariantCard } from "@/components/review/InvariantCard";
import { IntentCard } from "@/components/review/IntentCard";
import { TierTable } from "@/components/review/TierTable";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Section";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useApprove, usePatchIntent, usePatchInvariant, usePatchTier, useProtocol, useResults } from "@/api/queries";
import { lastEventIdFor, openStream } from "@/api/stream";
import { errorMessage } from "@/api/errors";
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
  if (!runId) return shell(<EmptyState action={<ButtonLink href={`/p/${id}/analysis`}>Open analysis</ButtonLink>}>No analysis has run for this protocol yet.</EmptyState>);
  if (results.isError) return shell(<ErrorState what="the analysis results" error={results.error} onRetry={() => results.refetch()} />);
  if (!data) return shell(null);
  if (data.run.status === "running" || data.run.status === "queued")
    return shell(<EmptyState action={<ButtonLink href={`/p/${id}/analysis`}>Watch the live log →</ButtonLink>}>The analysis is still running. Review opens when it finishes.</EmptyState>);

  const tr = data.testReport;
  const gas = (tr?.gas ?? {}) as Record<string, { plain?: number | null; guarded?: number | null; overhead?: number | null } | unknown>;
  const gasRows = Object.entries(gas).filter(([, v]) => v && typeof v === "object" && "overhead" in (v as object)) as [string, { plain?: number | null; guarded?: number | null; overhead?: number | null }][];

  return shell(
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Step 3 of 5 · Review</SectionLabel>
          <h1 className="mt-3 text-32 font-medium">Review what the guard will enforce</h1>
        </div>
        {locked ? (
          <ButtonLink href={`/p/${id}/analysis`} variant="secondary">
            Review locked · follow packaging →
          </ButtonLink>
        ) : null}
      </div>

      {/* Banner: test report + gas overhead per entry point */}
      <section aria-label="Test report" className="k-panel mt-8 grid gap-px overflow-hidden bg-line md:grid-cols-12">
        <div className="bg-surface p-5 md:col-span-5">
          <p className="k-label">Fork test report</p>
          <p className="mt-3 font-mono text-22 text-text">
            <span className="text-pass">{tr?.attacksBlocked ?? 0}/{tr?.attacksTotal ?? 0}</span> attacks blocked
          </p>
          <p className="mt-1 font-mono text-15 text-text-2">
            <span className="text-pass">{num(tr?.normalPass)}/{num(tr?.normalTxCount)}</span> normal txs passed · {data.entrypoints.length} entry points
          </p>
        </div>
        <div className="bg-surface p-5 md:col-span-7">
          <p className="k-label">Gas overhead per entry point</p>
          {gasRows.length ? (
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-13 sm:grid-cols-3">
              {gasRows.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="text-text-3">{k}</span>
                  <span className="k-tnum text-text">+{num(v.overhead)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-13 text-text-3">No gas measurements in this report.</p>
          )}
        </div>
      </section>

      <Tabs.Root defaultValue="invariants" className="mt-8">
        <Tabs.List aria-label="Review sections" className="flex gap-1 border-b border-line">
          {[
            ["invariants", `Invariants · ${invariants.length}`, undecided.length ? `${undecided.length} flagged` : null],
            ["intents", `Intents · ${data.intentSchemas.length}`, null],
            ["tiers", `Admin tiers · ${data.tiers.length}`, null],
          ].map(([v, label, badge]) => (
            <Tabs.Trigger key={v} value={v!} className="-mb-px flex h-11 items-center gap-2 border-b-2 border-transparent px-4 text-15 text-text-2 hover:text-text data-[state=active]:border-text data-[state=active]:text-text">
              {label}
              {badge ? <span className="font-mono text-11 text-queue">{badge}</span> : null}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="invariants" className="mt-6 grid gap-4">
          {invariants.length === 0 ? <EmptyState>No invariants were drafted. Re-analyze after checking the repo compiles.</EmptyState> : null}
          {invariants.map((inv) => (
            <InvariantCard
              key={`${inv.id}-${JSON.stringify(inv.params)}`}
              inv={inv}
              locked={locked}
              busy={patchInv.isPending && patchInv.variables?.id === inv.id}
              onDecide={(status) => patchInv.mutate({ id: inv.id, status }, { onError })}
              onSaveParams={(params) => patchInv.mutate({ id: inv.id, params }, { onError })}
            />
          ))}
        </Tabs.Content>

        <Tabs.Content value="intents" className="mt-6 grid gap-4">
          {data.intentSchemas.length === 0 ? <EmptyState>No user entry points were found, so there are no intents.</EmptyState> : null}
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

        <Tabs.Content value="tiers" className="mt-6">
          {data.tiers.length === 0 ? (
            <EmptyState>No privileged functions found.</EmptyState>
          ) : (
            <TierTable tiers={data.tiers} entries={entries} locked={locked} onChange={(t, tier) => patchTier.mutate({ id: t.id, tier }, { onError })} />
          )}
          <p className="mt-3 text-13 text-text-3">Safer instantly, riskier slowly: Tier 0 instant (guardian), Tier 1 48h, Tier 2 7 days, Tier 3 14 days plus an independent co-sign.</p>
        </Tabs.Content>
      </Tabs.Root>

      {!locked ? (
        <div className="sticky bottom-0 z-20 -mx-5 mt-10 border-t border-line bg-bg px-5 py-4 md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={onApprove} disabled={undecided.length > 0 || approvedCount === 0} busy={approve.isPending}>
              Approve and build guard
            </Button>
            <span className="text-13 text-text-3" aria-live="polite">
              {undecided.length > 0
                ? `Decide ${undecided.length} flagged invariant${undecided.length > 1 ? "s" : ""} first.`
                : "Locks the review. Undecided items are approved as proposed. You’ll follow packaging in the live log."}
            </span>
          </div>
        </div>
      ) : null}
    </>,
  );
}
