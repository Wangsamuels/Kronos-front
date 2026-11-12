"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, PageHead, StepEyebrow } from "@/components/ui/Page";
import { ArrowRight, Check, Cross, Spinner } from "@/components/ui/Icons";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { useDeployments, useMeta, useProtocol, useVerifyDeployment } from "@/api/queries";
import { ApiError, errorMessage } from "@/api/errors";
import type { Deployment, VerifyCheck } from "@/api/types";
import { ADDRESS_RE } from "@/lib/validate";
import { chainName } from "@/lib/chains";
import { cn } from "@/lib/cn";

const EXPECTED = ["config hash matches the approved package", "every entry point is guarded", "the timelock owns privileged roles", "monitor subscribed", "first attestation received"];

export function VerifyScreen({ id }: { id: string }) {
  const protocol = useProtocol(id);
  const deployments = useDeployments(id);
  const verify = useVerifyDeployment(id);
  const [guard, setGuard] = useState("");
  const [timelock, setTimelock] = useState("");
  const [result, setResult] = useState<Deployment | null>(null);
  const [shown, setShown] = useState(0);
  const meta = useMeta();
  const [chainId, setChainId] = useState<number | null>(null);

  // Auto-fill from a detected deployment (e.g. the merged PR's deploy).
  useEffect(() => {
    const d = deployments.data?.find((x) => x.chainId === (chainId ?? protocol.data?.chainId)) ?? (chainId === null ? deployments.data?.[0] : undefined);
    if (d && !guard) {
      setGuard(d.guardAddress);
      if (d.timelockAddress) setTimelock(d.timelockAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployments.data, chainId]);

  const checks = ((result?.checks ?? []) as VerifyCheck[]).filter(Boolean);
  useEffect(() => {
    if (!result) return;
    setShown(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setShown(checks.length);
    const t = setInterval(() => setShown((n) => (n >= checks.length ? n : n + 1)), 260);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const shell = (c: React.ReactNode) => (
    <OnboardingShell step="verify" protocolId={id} wide>
      {c}
    </OnboardingShell>
  );
  if (protocol.isLoading) return shell(<LoadingBlock lines={6} />);
  if (protocol.isError || !protocol.data) return shell(<ErrorState what="this protocol" error={protocol.error} onRetry={() => protocol.refetch()} />);

  const p = protocol.data;
  const chain = chainId ?? p.chainId;
  const chainOptions = meta.data?.chains?.length ? meta.data.chains.map((c) => ({ id: c.chainId, name: chainName(c.chainId) })) : [{ id: p.chainId, name: chainName(p.chainId) }];
  const registered = new Set((deployments.data ?? []).filter((d) => d.verified).map((d) => d.chainId));
  const gErr = guard && !ADDRESS_RE.test(guard) ? "Not a 0x address" : null;
  const tErr = timelock && !ADDRESS_RE.test(timelock) ? "Not a 0x address" : null;
  const done = result && shown >= checks.length;
  const live = done && result.verified;
  const failed = done && !result.verified;

  const run = async () => {
    setResult(null);
    try {
      const d = await verify.mutateAsync({ chainId: chain, guardAddress: guard, timelockAddress: timelock || undefined });
      setResult(d);
    } catch {}
  };

  const passed = result ? checks.slice(0, shown).filter((c) => c.ok).length : 0;
  const total = result ? checks.length : EXPECTED.length;

  return shell(
    <>
      <PageHead
        eyebrow={<StepEyebrow n={5} label="Verify" />}
        title="Verify the deployment and go live"
        lede="Register the deployment on each chain you deployed to. Kronos reads the contracts on that chain, and the guard goes live there only when every check passes."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="grid content-start gap-6 lg:col-span-5">
          <form
            className="grid gap-5 rounded-panel border border-line-2 bg-surface p-5 md:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!gErr && !tErr && guard) void run();
            }}
          >
            {chainOptions.length > 1 ? (
              <fieldset>
                <legend className="mb-2 text-13 font-medium text-text">Chain</legend>
                <div className="grid gap-2 min-[520px]:grid-cols-2">
                  {chainOptions.map((c) => {
                    const on = chain === c.id;
                    return (
                      <label key={c.id} className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-ctl border px-3 text-15 transition-colors duration-k has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text", on ? "border-text bg-surface-2 text-text" : "border-line-2 text-text-2 hover:border-text-3")}>
                        <input
                          type="radio"
                          name="verify-chain"
                          className="sr-only"
                          checked={on}
                          onChange={() => {
                            setChainId(c.id);
                            setGuard("");
                            setTimelock("");
                            setResult(null);
                          }}
                        />
                        <span aria-hidden className={cn("grid size-4 shrink-0 place-items-center rounded-full border", on ? "border-text" : "border-text-3")}>
                          <span className={cn("block size-2 rounded-full", on ? "bg-text" : "bg-transparent")} />
                        </span>
                        <span className="truncate">{c.name}</span>
                        {registered.has(c.id) ? <span className="ml-auto font-mono text-11 uppercase tracking-[0.06em] text-pass">live</span> : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
            <Field label="Guard address" error={gErr} hint={registered.has(chain) ? "Registered on this chain. Verifying again replaces the earlier entry." : "The address the deploy script printed."}>
              <input className="k-input" placeholder="0x…" value={guard} onChange={(e) => setGuard(e.target.value.trim())} aria-invalid={!!gErr} spellCheck={false} autoComplete="off" />
            </Field>
            <Field label="Timelock address" optional error={tErr} hint="Read from the guard when left empty.">
              <input className="k-input" placeholder="0x…" value={timelock} onChange={(e) => setTimelock(e.target.value.trim())} aria-invalid={!!tErr} spellCheck={false} autoComplete="off" />
            </Field>
            <Button type="submit" size="lg" disabled={!guard || !!gErr || !!tErr} busy={verify.isPending} className="w-full">
              {result ? "Verify again" : "Verify on-chain"}
              {verify.isPending ? null : <ArrowRight />}
            </Button>
            {verify.isError ? (
              <p role="alert" className="font-mono text-13 text-block">
                {verify.error instanceof ApiError && verify.error.status === 409 ? "No package has been approved for this protocol yet. Finish the review first." : errorMessage(verify.error)}
              </p>
            ) : null}
          </form>

          {live ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative isolate overflow-hidden rounded-panel border border-pass/40 bg-pass/[0.06] p-6 md:p-8">
              <div aria-hidden className="k-grid-bg pointer-events-none absolute inset-0 -z-10 opacity-60" />
              <p className="flex items-center gap-4 font-mono text-64 font-medium leading-none tracking-[-0.04em] text-pass">
                <span className="relative flex size-4">
                  <span aria-hidden className="absolute inset-0 animate-k-ping rounded-full bg-pass" />
                  <span aria-hidden className="relative block size-4 rounded-full bg-pass" />
                </span>
                LIVE
              </p>
              <p className="mt-5 text-17 text-text">
                {p.name} is guarded on {chainName(chain)}.
              </p>
              <p className="mt-1 text-15 text-text-2">The monitor and the attestor are subscribed.</p>
              <ButtonLink href={`/p/${id}`} className="mt-6 w-full" size="lg">
                Open dashboard
                <ArrowRight />
              </ButtonLink>
            </motion.div>
          ) : null}
          {failed ? (
            <div role="alert" className="rounded-panel border border-block/40 bg-block/[0.06] p-5 md:p-6">
              <span className="k-tag k-tag-block">not live</span>
              <p className="mt-4 text-22 font-medium text-text">
                {checks.filter((c) => !c.ok).length} check{checks.filter((c) => !c.ok).length === 1 ? "" : "s"} failed
              </p>
              <p className="mt-1.5 text-15 text-text-2">Each failed check lists its fix. Apply them, redeploy if needed, then verify again.</p>
              <ButtonLink href={`/p/${id}/integrate`} variant="secondary" className="mt-5">
                <ArrowRight className="rotate-180" />
                Back to Integrate
              </ButtonLink>
            </div>
          ) : null}
        </div>

        <section className="overflow-hidden rounded-panel border border-line-2 bg-surface lg:col-span-7" aria-live="polite" aria-label="Verification checklist">
          <div className="k-bar">
            <span>On-chain checklist</span>
            <span className="k-tnum">{result ? `${passed}/${total} passed` : verify.isPending ? "reading chain…" : `${total} checks`}</span>
          </div>
          <div aria-hidden className="h-0.5 bg-line">
            <div className={cn("h-full transition-[width] duration-300 ease-k", failed ? "bg-block" : "bg-pass")} style={{ width: result ? `${(shown / Math.max(1, total)) * 100}%` : "0%" }} />
          </div>
          <ul>
            {(result ? checks : EXPECTED.map((name) => ({ name, ok: false, detail: null }))).map((c, i) => {
              const state = !result ? (verify.isPending ? "running" : "pending") : i < shown ? (c.ok ? "ok" : "fail") : "running";
              return (
                <motion.li key={`${c.name}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4 border-b border-line px-5 py-4 last:border-b-0">
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                      state === "ok" ? "border-pass/40 bg-pass/10 text-pass" : state === "fail" ? "border-block/40 bg-block/10 text-block" : state === "running" ? "border-line-2 text-text-2" : "border-line-2 text-text-3",
                    )}
                  >
                    {state === "ok" ? <Check className="size-3.5" /> : state === "fail" ? <Cross className="size-3.5" /> : state === "running" ? <Spinner className="size-3.5" /> : <span className="k-tnum font-mono text-11">{i + 1}</span>}
                    <span className="sr-only">{state === "ok" ? "passed" : state === "fail" ? "failed" : state === "running" ? "checking" : "pending"}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-15 first-letter:uppercase", state === "pending" ? "text-text-2" : "text-text")}>{c.name}</p>
                    {state === "ok" && c.detail ? <p className="mt-1 truncate font-mono text-11 text-text-3">{c.detail}</p> : null}
                    {state === "fail" ? (
                      <p className="mt-2 rounded-ctl border border-line bg-surface-2 px-3 py-2 font-mono text-13 text-text-2">
                        <span className="mr-2 text-block">fix</span>
                        {c.detail ?? "see the deploy script output"}
                      </p>
                    ) : null}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </section>
      </div>
    </>,
  );
}
