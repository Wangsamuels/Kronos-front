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
import { PageHead, StepEyebrow } from "@/components/ui/Page";
import { ArrowRight, Refresh } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";
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
    phase === "packaging" ? "Building the guard package" : phase === "packaged" ? "Package ready" : phase === "unsupported" ? "Not a lending protocol (yet)" : phase === "review" ? "Ready for review" : phase === "failed" ? "Analysis failed" : "Live analysis";

  const lede =
    phase === "packaging"
      ? "Review is locked. The package builder is assembling the guard, the tests and the deploy script."
      : phase === "packaged"
        ? "The guard package is built. Next: merge it into your repo."
        : phase === "unsupported"
          ? "Kronos classified this repo as something other than lending."
          : phase === "review"
            ? "The run is finished. Check what the guard will enforce before anything ships."
            : phase === "failed"
              ? "The run stopped before it finished. The log shows where."
              : "Agents are mapping entry points, drafting invariants and attacking them on a fork. You can leave and come back.";

  return (
    <OnboardingShell step="analysis" protocolId={id} wide>
      <PageHead eyebrow={<StepEyebrow n={2} label="Analyze" note={phase === "packaging" || phase === "packaged" ? "packaging" : undefined} />} title={title} lede={lede} />

      <div className="mt-8 min-w-0 overflow-hidden rounded-panel border border-line-2 bg-surface px-4 pb-3 pt-4 md:px-5">
        <StageRail stages={PIPELINE} current={phase === "packaged" ? undefined : phase === "review" || lastStage === "review" ? "package" : lastStage} waiting={phase === "review"} failed={phase === "failed" ? failedStage : undefined} done={phase === "packaged"} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <LogStream
          events={stream.events}
          live={live && phase !== "review"}
          header={
            <div className="k-bar">
              <span className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="hidden gap-1.5 min-[520px]:flex">
                  <span className="block size-2 rounded-full bg-line-2" />
                  <span className="block size-2 rounded-full bg-line-2" />
                  <span className="block size-2 rounded-full bg-line-2" />
                </span>
                <span className="truncate">live log{runId ? ` · run ${runId.slice(0, 8)}` : ""}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 normal-case tracking-normal" aria-live="polite">
                <span
                  aria-hidden
                  className={cn("block size-1.5 rounded-full", stream.status === "open" ? "animate-k-pulse bg-pass" : stream.status === "connecting" ? "animate-k-pulse bg-queue" : stream.status === "unreachable" ? "bg-block" : "bg-text-3")}
                />
                {stream.status === "connecting"
                  ? "connecting…"
                  : stream.status === "open"
                    ? stream.resumedFrom > 0
                      ? `streaming · resumed after #${stream.resumedFrom}`
                      : "streaming"
                    : stream.status === "unreachable"
                      ? "disconnected"
                      : `${stream.events.length} events · last #${stream.lastEventId}`}
              </span>
            </div>
          }
        />

        <div className="grid min-w-0 grid-cols-1 content-start gap-4">
          {phase === "review" ? (
            <Outcome tone="pass" word="ready for review">
              <p className="text-22 font-medium text-text">Analysis complete.</p>
              {results.data ? (
                <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-13 text-text-2">
                  <li>
                    <span className="k-tnum block text-22 text-text">{results.data.entrypoints.length}</span>entry points
                  </li>
                  <li>
                    <span className="k-tnum block text-22 text-text">{results.data.invariants.length}</span>invariants
                  </li>
                  <li>
                    <span className="k-tnum block text-22 text-text">
                      {results.data.testReport?.attacksBlocked ?? 0}/{results.data.testReport?.attacksTotal ?? 0}
                    </span>
                    attacks blocked
                  </li>
                  <li>
                    <span className="k-tnum block text-22 text-text">
                      {results.data.testReport?.normalPass ?? 0}/{results.data.testReport?.normalTxCount ?? 0}
                    </span>
                    normal txs passed
                  </li>
                </ul>
              ) : (
                <p className="mt-2 text-15 text-text-2">{[...stream.events].reverse().find((e) => e.type === "done")?.message}</p>
              )}
              <ButtonLink href={`/p/${id}/review`} size="lg" className="mt-6 w-full">
                Review results
                <ArrowRight />
              </ButtonLink>
            </Outcome>
          ) : null}

          {phase === "packaging" ? (
            <Outcome tone="queue" word="approved · packaging">
              <p className="text-17 font-medium text-text">Building the package.</p>
              <p className="mt-1.5 text-15 text-text-2">This log continues from the original run. The next step opens as soon as the package exists.</p>
            </Outcome>
          ) : null}

          {phase === "packaged" ? (
            <Outcome tone="pass" word="package built">
              <p className="text-17 font-medium text-text">{pkgDone?.message ?? "The guard package is ready."}</p>
              <ButtonLink href={`/p/${id}/integrate`} size="lg" className="mt-5 w-full">
                Integrate
                <ArrowRight />
              </ButtonLink>
            </Outcome>
          ) : null}

          {phase === "failed" ? (
            <Outcome tone="block" word={`failed at ${stageLabel(failedStage ?? run.data?.stage ?? "unknown").toLowerCase()}`} role="alert">
              <p className="text-17 font-medium text-text">The analysis didn’t finish.</p>
              <p className="mt-1.5 break-words font-mono text-13 text-text-2">{errorEv?.message ?? errorMessage((run.data?.error as { message?: string } | undefined)?.message ?? "Analysis failed")}</p>
              <Button className="mt-5" variant="secondary" onClick={retry} busy={reanalyze.isPending}>
                <Refresh className="size-3.5" />
                Run it again
              </Button>
            </Outcome>
          ) : null}

          {stream.status === "unreachable" ? (
            <Outcome tone="block" word="connection lost" role="alert">
              <p className="text-17 font-medium text-text">Lost the live log connection.</p>
              <p className="mt-1.5 text-15 text-text-2">The run keeps going on the server. Reconnecting resumes after event #{stream.lastEventId}.</p>
              <Button className="mt-5" variant="secondary" onClick={() => runId && openStream(runId)}>
                <Refresh className="size-3.5" />
                Reconnect
              </Button>
            </Outcome>
          ) : null}

          {phase === "unsupported" ? (
            <>
              <Waitlist protocolType={protocol.data?.type && protocol.data.type !== "lending" ? protocol.data.type : "bridge"} />
              <Button variant="secondary" onClick={() => router.push("/connect")}>
                <ArrowRight className="rotate-180" />
                Link a different repo
              </Button>
            </>
          ) : null}

          <div className="overflow-hidden rounded-panel border border-line-2 bg-surface" aria-live="polite">
            <p className="k-bar">Found so far</p>
            <dl className="grid grid-cols-2">
              <Stat label="Contracts" value={counters.contracts} />
              <Stat label="Entry points" value={counters.entryUser + counters.entryPrivileged} sub={`${counters.entryUser} user · ${counters.entryPrivileged} privileged`} />
              <Stat label="Invariants drafted" value={counters.invariants} sub={counters.flagged ? `${counters.flagged} flagged for review` : undefined} subTone="queue" />
              <Stat label="Attacks blocked" value={counters.attacksBlocked} sub={`of ${counters.attacksTried} tried`} />
              <Stat label="Transactions replayed" value={counters.txReplayed} sub={counters.txReplayed ? `${counters.txPassed} passed` : undefined} wide />
            </dl>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

function Outcome({ tone, word, children, role }: { tone: "pass" | "queue" | "block"; word: string; children: React.ReactNode; role?: "alert" }) {
  return (
    <div role={role} className="rounded-panel border border-line-2 bg-surface p-5 md:p-6">
      <span className={cn("k-tag", `k-tag-${tone}`)}>{word}</span>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub, subTone, wide }: { label: string; value: number; sub?: string; subTone?: "queue"; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 border-t border-line p-5" : "border-t border-line p-5 odd:border-r [&:nth-child(-n+2)]:border-t-0"}>
      <dt className="text-13 text-text-2">{label}</dt>
      <dd className="mt-1.5 text-32 leading-none text-text">
        <Counter value={value} />
      </dd>
      {sub ? <dd className={subTone === "queue" ? "mt-2 font-mono text-11 text-queue" : "mt-2 font-mono text-11 text-text-3"}>{sub}</dd> : null}
    </div>
  );
}
