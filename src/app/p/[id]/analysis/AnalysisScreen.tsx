"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { OnboardingShell } from "@/components/OnboardingShell";
import { LogStream, stageLabel } from "@/components/LogStream";
import { Counter } from "@/components/Counter";
import { StageRail } from "@/components/TraceRail";
import { Waitlist } from "@/components/connect/Waitlist";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Section";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { deriveCounters, derivePhase, PIPELINE } from "@/components/analysis/derive";
import { qk, useProtocol, useReanalyze, useResults, useRun } from "@/api/queries";
import { openStream, useAnalysisStream } from "@/api/stream";
import { errorMessage } from "@/api/errors";

export function AnalysisScreen({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const protocol = useProtocol(id, { poll: 15_000 });
  const runId = protocol.data?.latestRunId;
  const stream = useAnalysisStream(runId);
  const run = useRun(runId, stream.status === "open" ? 10_000 : undefined);
  const phase = derivePhase(stream.events, run.data?.status, protocol.data?.status);
  const counters = useMemo(() => deriveCounters(stream.events), [stream.events]);
  const results = useResults(phase === "review" || phase === "packaging" || phase === "packaged" ? runId : null);
  const reanalyze = useReanalyze(id);
  const live = stream.status === "open" || stream.status === "connecting";
  const lastStage = [...stream.events].reverse().find((e) => e.type === "stage" || e.type === "log")?.stage;
  const errorEv = [...stream.events].reverse().find((e) => e.type === "error");
  const failedStage = errorEv ? [...stream.events].reverse().find((e) => e.id < errorEv.id && e.stage !== "failed")?.stage : undefined;
  const pkgDone = [...stream.events].reverse().find((e) => e.type === "done" && e.stage === "package");

  if (protocol.isLoading) return <OnboardingShell step="analysis" protocolId={id} wide><LoadingBlock lines={8} /></OnboardingShell>;
  if (protocol.isError) return <OnboardingShell step="analysis" protocolId={id} wide><ErrorState what="this protocol" error={protocol.error} onRetry={() => protocol.refetch()} /></OnboardingShell>;

  const retry = async () => {
    await reanalyze.mutateAsync();
    await qc.invalidateQueries({ queryKey: qk.protocol(id) });
  };

  const title =
    phase === "packaging" ? "Building the guard package" : phase === "packaged" ? "Package ready" : phase === "unsupported" ? "Not a lending protocol (yet)" : "Live analysis";

  return (
    <OnboardingShell step="analysis" protocolId={id} wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>Step 2 of 5 · Analyze{phase === "packaging" || phase === "packaged" ? " · packaging" : ""}</SectionLabel>
          <h1 className="mt-3 text-32 font-medium">{title}</h1>
        </div>
        <StageRail stages={PIPELINE} current={phase === "packaged" ? undefined : lastStage === "review" ? "package" : lastStage} failed={phase === "failed" ? failedStage : undefined} done={phase === "packaged"} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <LogStream
          events={stream.events}
          live={live && phase !== "review"}
          header={
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <span className="k-label">live log{runId ? ` · run ${runId.slice(0, 8)}` : ""}</span>
              <span className="font-mono text-11 text-text-3" aria-live="polite">
                {stream.status === "connecting"
                  ? "connecting…"
                  : stream.status === "open"
                    ? stream.resumedFrom > 0
                      ? `streaming · resumed after event #${stream.resumedFrom}`
                      : "streaming"
                    : stream.status === "unreachable"
                      ? "disconnected"
                      : `${stream.events.length} events · last #${stream.lastEventId}`}
              </span>
            </div>
          }
        />

        <div className="grid content-start gap-4">
          <div className="k-panel" aria-live="polite">
            <div className="k-label border-b border-line px-5 py-3">Counters</div>
            <dl className="grid grid-cols-2">
              <Stat label="Contracts found" value={counters.contracts} />
              <Stat label="Entry points" value={counters.entryUser + counters.entryPrivileged} sub={`${counters.entryUser} user · ${counters.entryPrivileged} privileged`} />
              <Stat label="Invariants drafted" value={counters.invariants} sub={counters.flagged ? `${counters.flagged} flagged for review` : undefined} subTone="queue" />
              <Stat label="Attacks blocked" value={counters.attacksBlocked} sub={`of ${counters.attacksTried} tried`} />
              <Stat label="Txs replayed" value={counters.txReplayed} sub={counters.txReplayed ? `${counters.txPassed} passed` : undefined} wide />
            </dl>
          </div>

          {stream.status === "unreachable" ? (
            <div role="alert" className="k-panel border-l-2 border-l-block p-5">
              <p className="text-15 text-text">Lost the live log connection.</p>
              <p className="mt-1 font-mono text-13 text-text-2">The run keeps going on the server. Reconnecting resumes after event #{stream.lastEventId}.</p>
              <Button className="mt-3" variant="secondary" size="sm" onClick={() => runId && openStream(runId)}>
                Retry
              </Button>
            </div>
          ) : null}

          {phase === "review" ? (
            <div className="k-panel border-l-2 border-l-pass p-5">
              <p className="font-mono text-13 text-pass">done · ready for review</p>
              {results.data ? (
                <p className="mt-2 text-17 text-text">
                  {results.data.entrypoints.length} entry points · {results.data.invariants.length} invariants · {results.data.testReport?.attacksBlocked ?? 0}/{results.data.testReport?.attacksTotal ?? 0} attacks blocked ·{" "}
                  {results.data.testReport?.normalPass ?? 0}/{results.data.testReport?.normalTxCount ?? 0} normal txs passed
                </p>
              ) : (
                <p className="mt-2 text-17 text-text">{[...stream.events].reverse().find((e) => e.type === "done")?.message}</p>
              )}
              <ButtonLink href={`/p/${id}/review`} className="mt-4">
                Review results →
              </ButtonLink>
            </div>
          ) : null}

          {phase === "packaging" ? (
            <div className="k-panel border-l-2 border-l-queue p-5">
              <p className="font-mono text-13 text-queue">approved · packaging</p>
              <p className="mt-2 text-15 text-text-2">Review is locked. The package builder is assembling the guard, tests and deploy script. This log continues from the original run.</p>
            </div>
          ) : null}

          {phase === "packaged" ? (
            <div className="k-panel border-l-2 border-l-pass p-5">
              <p className="font-mono text-13 text-pass">done · package built</p>
              <p className="mt-2 text-15 text-text">{pkgDone?.message ?? "The guard package is ready."}</p>
              <ButtonLink href={`/p/${id}/integrate`} className="mt-4">
                Integrate →
              </ButtonLink>
            </div>
          ) : null}

          {phase === "failed" ? (
            <div role="alert" className="k-panel border-l-2 border-l-block p-5">
              <p className="font-mono text-13 text-block">failed at {stageLabel(failedStage ?? run.data?.stage ?? "unknown")}</p>
              <p className="mt-2 text-15 text-text">{errorEv?.message ?? errorMessage((run.data?.error as { message?: string } | undefined)?.message ?? "Analysis failed")}</p>
              <Button className="mt-4" variant="secondary" onClick={retry} busy={reanalyze.isPending}>
                Retry
              </Button>
            </div>
          ) : null}

          {phase === "unsupported" ? (
            <>
              <Waitlist protocolType={protocol.data?.type && protocol.data.type !== "lending" ? protocol.data.type : "bridge"} />
              <Button variant="ghost" onClick={() => router.push("/connect")}>
                ← Link a different repo
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </OnboardingShell>
  );
}

function Stat({ label, value, sub, subTone, wide }: { label: string; value: number; sub?: string; subTone?: "queue"; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 border-t border-line p-5" : "border-t border-line p-5 odd:border-r [&:nth-child(-n+2)]:border-t-0"}>
      <dt className="k-label">{label}</dt>
      <dd className="mt-2 text-32 text-text">
        <Counter value={value} />
      </dd>
      {sub ? <dd className={subTone === "queue" ? "mt-1 font-mono text-11 text-queue" : "mt-1 font-mono text-11 text-text-3"}>{sub}</dd> : null}
    </div>
  );
}
