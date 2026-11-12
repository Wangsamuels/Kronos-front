"use client";
import { AppBar } from "./SiteNav";
import { StepRail, reachedStep, type StepKey } from "./StepRail";
import { useProtocol, useRun } from "@/api/queries";
import { ProtocolStatusPill } from "./StatusPill";

/** Full-screen single-column onboarding: no sidebar, 5-step rail on top, one primary action per screen. */
export function OnboardingShell({ step, protocolId, children, wide }: { step: StepKey; protocolId?: string; children: React.ReactNode; wide?: boolean }) {
  const p = useProtocol(protocolId ?? "", { poll: undefined });
  const protocol = protocolId ? p.data : undefined;
  const run = useRun(protocol?.latestRunId);
  return (
    <div className="min-h-dvh">
      <AppBar
        crumbs={[{ href: "/p", label: "Protocols" }, ...(protocol ? [{ label: protocol.name }] : [{ label: "New protocol" }])]}
        right={protocol ? <ProtocolStatusPill status={protocol.status} /> : null}
      />
      <StepRail current={step} protocolId={protocolId} reached={reachedStep(protocol?.status, run.data?.status)} />
      <main id="main" className="k-container pb-24 pt-10 md:pt-14">
        {wide ? children : <div className="max-w-[760px]">{children}</div>}
      </main>
    </div>
  );
}
