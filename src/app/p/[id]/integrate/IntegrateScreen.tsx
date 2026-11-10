"use client";
import { useState } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { DiffPreview } from "@/components/integrate/DiffPreview";
import { Markdown } from "@/components/integrate/Markdown";
import { CodeTabs } from "@/components/code/CodeTabs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Section";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useOpenPr, useProtocol, useRunPackage } from "@/api/queries";
import { api } from "@/api/client";
import { ApiError, errorMessage } from "@/api/errors";
import type { PackageManifest } from "@/api/types";
import { chainById } from "@/lib/chains";
import { cn } from "@/lib/cn";

export function IntegrateScreen({ id }: { id: string }) {
  const toast = useToast();
  const protocol = useProtocol(id);
  const runId = protocol.data?.latestRunId;
  const pkg = useRunPackage(runId);
  const pr = useOpenPr(pkg.data?.id, runId ?? "");
  const [mode, setMode] = useState<"pr" | "manual">("pr");
  const [downloading, setDownloading] = useState(false);

  const shell = (c: React.ReactNode) => (
    <OnboardingShell step="integrate" protocolId={id} wide>
      {c}
    </OnboardingShell>
  );
  if (protocol.isLoading || pkg.isLoading) return shell(<LoadingBlock lines={10} />);
  if (protocol.isError) return shell(<ErrorState what="this protocol" error={protocol.error} onRetry={() => protocol.refetch()} />);
  if (pkg.error instanceof ApiError && pkg.error.status === 404)
    return shell(
      <EmptyState action={<ButtonLink href={`/p/${id}/analysis`}>Follow packaging in the live log →</ButtonLink>}>
        The package is still being built. This page fills in as soon as it is ready.
      </EmptyState>,
    );
  if (pkg.isError) return shell(<ErrorState what="the package" error={pkg.error} onRetry={() => pkg.refetch()} />);
  if (!pkg.data) return shell(null);

  const m = (pkg.data.manifest ?? {}) as PackageManifest;
  const generated = m.diffPreview?.generated ?? [];
  const added = m.diffPreview?.added ?? m.files?.map((f) => f.path) ?? [];
  const files = generated.length ? generated : added.map((p) => ({ path: p, content: "" }));
  const integrationMd = generated.find((f) => f.path === "INTEGRATION.md")?.content;
  const sdk = generated.find((f) => f.path.startsWith("sdk/"))?.content ??
    `import { Kronos } from "@kronos/sdk";\n\nconst kronos = new Kronos({ chainId, guard: GUARD_ADDRESS });\nconst intent = await kronos.borrow({ asset: USDC, amount, maxLTV: 0.7, minHealth: 1.2 });\nawait kronos.submit(intent, walletClient);`;
  const chain = chainById(protocol.data?.chainId);
  const rpcVar = chain?.key === "aurora-testnet" ? "RPC_AURORA_TESTNET" : "RPC_BASE_SEPOLIA";
  const deploy = `forge test --match-path 'test/kronos/*'\nforge script script/DeployKronos.s.sol --rpc-url $${rpcVar} --broadcast   # ${chain?.name ?? "your chain"} (${protocol.data?.chainId})`;
  const prUrl = pr.data?.prUrl ?? pkg.data.prUrl;

  const download = async () => {
    setDownloading(true);
    try {
      const { data, response } = await api.GET("/v1/packages/{id}/download", { params: { path: { id: pkg.data!.id }, query: {} }, parseAs: "blob" });
      if (!response.ok || !data) throw new ApiError(response.status, `HTTP_${response.status}`, "Download failed");
      const url = URL.createObjectURL(data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kronos-package-${pkg.data!.version}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast({ title: "Download failed", body: errorMessage(e), tone: "block" });
    } finally {
      setDownloading(false);
    }
  };

  return shell(
    <>
      <SectionLabel>Step 4 of 5 · Integrate</SectionLabel>
      <h1 className="mt-3 text-32 font-medium">Merge the guard into your repo</h1>
      <p className="mt-2 font-mono text-13 text-text-3">
        package v{pkg.data.version} · config hash {pkg.data.configHash.slice(0, 18)}…
      </p>
      {m.warnings?.length ? (
        <p role="alert" className="mt-4 border-l-2 border-queue pl-3 text-15 text-queue">
          {m.warnings.join(" · ")}
        </p>
      ) : null}

      <div role="radiogroup" aria-label="Integration method" className="mt-8 grid gap-3 md:grid-cols-2">
        {[
          { v: "pr" as const, t: "Open a pull request", s: "recommended · the GitHub App opens it on your repo" },
          { v: "manual" as const, t: "Manual", s: "download the package (.zip) and follow INTEGRATION.md" },
        ].map((o) => (
          <button
            key={o.v}
            role="radio"
            aria-checked={mode === o.v}
            onClick={() => setMode(o.v)}
            className={cn("k-panel p-5 text-left transition-colors duration-k", mode === o.v ? "border-text-3 bg-surface-2" : "hover:bg-surface-2/50")}
          >
            <p className="text-17 text-text">{o.t}</p>
            <p className="mt-1 font-mono text-13 text-text-3">{o.s}</p>
          </button>
        ))}
      </div>

      {mode === "pr" ? (
        <section className="mt-6 grid gap-4">
          <DiffPreview files={files} summary={m.diffPreview?.summary ?? `${files.length} files added`} />
          <div className="flex flex-wrap items-center gap-4">
            {prUrl ? (
              <>
                <a href={prUrl} target="_blank" rel="noreferrer" className="font-mono text-15 text-pass underline-offset-4 hover:underline">
                  ✓ PR opened · {prUrl.replace(/^https:\/\/github\.com\//, "")}
                </a>
                <span className="text-13 text-text-3">Review and merge it on GitHub, then deploy.</span>
              </>
            ) : (
              <>
                <Button onClick={() => pr.mutate(undefined, { onError: (e) => toast({ title: "Couldn’t open the PR", body: errorMessage(e), tone: "block" }) })} busy={pr.isPending}>
                  Open PR on GitHub
                </Button>
                <span className="text-13 text-text-3" aria-live="polite">
                  {pr.isPending ? "Opening the pull request through the Kronos GitHub App…" : m.prTitle ?? "Adds the guard, modifiers, timelock routing, tests and a deploy script."}
                </span>
              </>
            )}
          </div>
          {pr.isError ? <p className="font-mono text-13 text-block">{errorMessage(pr.error)}</p> : null}
        </section>
      ) : (
        <section className="mt-6 grid gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={download} busy={downloading}>
              Download package (.zip)
            </Button>
            <span className="font-mono text-13 text-text-3">{files.length} files</span>
          </div>
          <div className="k-panel p-6">{integrationMd ? <Markdown source={integrationMd} /> : <p className="text-15 text-text-2">INTEGRATION.md is inside the zip.</p>}</div>
        </section>
      )}

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionLabel as="h2">Add intents to your frontend</SectionLabel>
          <CodeTabs className="mt-3" tabs={[{ id: "sdk", label: "@kronos/sdk", code: sdk.trim(), lang: "typescript" }]} />
        </div>
        <div>
          <SectionLabel as="h2">Deploy</SectionLabel>
          <CodeTabs className="mt-3" tabs={[{ id: "deploy", label: `forge · ${chain?.name ?? "chain"}`, code: deploy, lang: "shellscript" }]} />
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <ButtonLink href={`/p/${id}/verify`} size="lg">
          I’ve deployed, verify it
        </ButtonLink>
        <span className="text-13 text-text-3">Kronos checks the deployment on-chain before it goes live.</span>
      </div>
    </>,
  );
}
