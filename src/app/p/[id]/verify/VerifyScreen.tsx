"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Section";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import { useDeployments, useProtocol, useVerifyDeployment } from "@/api/queries";
import { errorMessage } from "@/api/errors";
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

  // Auto-fill from a detected deployment (e.g. the merged PR's deploy).
  useEffect(() => {
    const d = deployments.data?.[0];
    if (d && !guard) {
      setGuard(d.guardAddress);
      if (d.timelockAddress) setTimelock(d.timelockAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployments.data]);

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
    <OnboardingShell step="verify" protocolId={id}>
      {c}
    </OnboardingShell>
  );
  if (protocol.isLoading) return shell(<LoadingBlock lines={6} />);
  if (protocol.isError || !protocol.data) return shell(<ErrorState what="this protocol" error={protocol.error} onRetry={() => protocol.refetch()} />);

  const p = protocol.data;
  const gErr = guard && !ADDRESS_RE.test(guard) ? "Not a 0x address" : null;
  const tErr = timelock && !ADDRESS_RE.test(timelock) ? "Not a 0x address" : null;
  const done = result && shown >= checks.length;
  const live = done && result.verified;
  const failed = done && !result.verified;

  const run = async () => {
    setResult(null);
    try {
      const d = await verify.mutateAsync({ chainId: p.chainId, guardAddress: guard, timelockAddress: timelock || undefined });
      setResult(d);
    } catch {}
  };

  return shell(
    <>
      <SectionLabel>Step 5 of 5 · Verify</SectionLabel>
      <h1 className="mt-3 text-32 font-medium">Verify the deployment and go live</h1>
      <p className="mt-2 text-15 text-text-2">Kronos reads the deployed guard on {chainName(p.chainId)} and only flips it live when every on-chain check passes.</p>

      <form
        className="mt-8 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!gErr && !tErr && guard) void run();
        }}
      >
        <label className="grid gap-2">
          <span className="k-label">Guard address</span>
          <input className="k-input" placeholder="0x…" value={guard} onChange={(e) => setGuard(e.target.value.trim())} aria-invalid={!!gErr} spellCheck={false} />
          {gErr ? <span className="font-mono text-11 text-block">{gErr}</span> : deployments.data?.[0] ? <span className="font-mono text-11 text-text-3">auto-filled from the detected deployment</span> : null}
        </label>
        <label className="grid gap-2">
          <span className="k-label">Timelock address (optional, read from the guard otherwise)</span>
          <input className="k-input" placeholder="0x…" value={timelock} onChange={(e) => setTimelock(e.target.value.trim())} aria-invalid={!!tErr} spellCheck={false} />
        </label>
        <div>
          <Button type="submit" size="lg" disabled={!guard || !!gErr || !!tErr} busy={verify.isPending}>
            {result ? "Verify again" : "Verify on-chain"}
          </Button>
        </div>
        {verify.isError ? (
          <p role="alert" className="font-mono text-13 text-block">
            {errorMessage(verify.error)}
          </p>
        ) : null}
      </form>

      <section className="k-panel mt-8" aria-live="polite" aria-label="Verification checklist">
        <div className="k-label border-b border-line px-5 py-3">Checklist</div>
        <ul className="divide-y divide-line">
          {(result ? checks : EXPECTED.map((name) => ({ name, ok: false, detail: null }))).map((c, i) => {
            const state = !result ? (verify.isPending ? "running" : "pending") : i < shown ? (c.ok ? "ok" : "fail") : "running";
            return (
              <motion.li key={`${c.name}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4 px-5 py-3">
                <span className={cn("w-12 shrink-0 font-mono text-13", state === "ok" ? "text-pass" : state === "fail" ? "text-block" : "text-text-3")}>
                  {state === "ok" ? "pass" : state === "fail" ? "fail" : state === "running" ? "…" : "—"}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-15", state === "fail" ? "text-text" : "text-text-2")}>{c.name}</p>
                  {state === "ok" && c.detail ? <p className="mt-0.5 truncate font-mono text-11 text-text-3">{c.detail}</p> : null}
                  {state === "fail" ? <p className="mt-1 font-mono text-13 text-block">fix: {c.detail ?? "see the deploy script output"}</p> : null}
                </div>
              </motion.li>
            );
          })}
        </ul>
      </section>

      {live ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-panel border border-pass/40 bg-pass/5 p-8">
          <p className="font-mono text-64 font-medium leading-none text-pass">LIVE</p>
          <p className="mt-3 text-15 text-text-2">
            {p.name} is guarded on {chainName(p.chainId)}. The monitor and attestor are subscribed.
          </p>
          <ButtonLink href={`/p/${id}`} className="mt-6" size="lg">
            Open dashboard →
          </ButtonLink>
        </motion.div>
      ) : null}
      {failed ? (
        <div role="alert" className="mt-8 rounded-panel border border-block/40 bg-block/5 p-6">
          <p className="font-mono text-15 text-block">not live · {checks.filter((c) => !c.ok).length} check(s) failed</p>
          <p className="mt-2 text-15 text-text-2">Apply the fixes above, redeploy if needed, then verify again.</p>
          <ButtonLink href={`/p/${id}/integrate`} variant="secondary" className="mt-4">
            ← Back to Integrate
          </ButtonLink>
        </div>
      ) : null}
    </>,
  );
}
