"use client";
import { useState } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { DiffPreview } from "@/components/integrate/DiffPreview";
import { Markdown } from "@/components/integrate/Markdown";
import { CodeTabs } from "@/components/code/CodeTabs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormSection, Notice, PageHead, StepEyebrow } from "@/components/ui/Page";
import { ArrowRight, ArrowUpRight, Download, GitHubMark } from "@/components/ui/Icons";
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
      <EmptyState title="The package is still being built" action={<ButtonLink href={`/p/${id}/analysis`}>Follow packaging in the live log</ButtonLink>}>
        This page fills in as soon as it is ready.
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
      <PageHead
        eyebrow={<StepEyebrow n={4} label="Integrate" />}
        title="Merge the guard into your repo"
        lede="Three things to do: merge the package, sign intents in your frontend, and deploy. Then Kronos verifies the result on-chain."
        right={
          <p className="flex flex-wrap items-center gap-2 font-mono text-11 text-text-3">
            <span className="k-tag k-tag-idle">package v{pkg.data.version}</span>
            <span title={pkg.data.configHash}>config {pkg.data.configHash.slice(0, 10)}…</span>
          </p>
        }
      />
      {m.warnings?.length ? (
        <Notice className="mt-6" role="alert" word="warning">
          {m.warnings.join(" · ")}
        </Notice>
      ) : null}

      <div className="mt-10 grid gap-8">
        <FormSection n="01" title="Merge the package" hint="A pull request is the fastest path. The manual route gives you the same files as a zip.">
          <div role="radiogroup" aria-label="Integration method" className="grid gap-3 md:grid-cols-2">
            {[
              { v: "pr" as const, t: "Open a pull request", s: "The Kronos GitHub App opens it on your repo.", tag: "recommended" },
              { v: "manual" as const, t: "Do it manually", s: "Download the package and follow INTEGRATION.md.", tag: null },
            ].map((o) => {
              const on = mode === o.v;
              return (
                <button
                  key={o.v}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMode(o.v)}
                  className={cn("flex items-start gap-3.5 rounded-panel border p-4 text-left transition-colors duration-k md:p-5", on ? "border-text bg-surface-2" : "border-line-2 bg-surface hover:border-text-3")}
                >
                  <span aria-hidden className={cn("mt-1 grid size-4 shrink-0 place-items-center rounded-full border", on ? "border-text" : "border-text-3")}>
                    <span className={cn("block size-2 rounded-full", on ? "bg-text" : "bg-transparent")} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2.5 text-17 font-medium text-text">
                      {o.t}
                      {o.tag ? <span className="k-tag k-tag-pass font-normal">{o.tag}</span> : null}
                    </span>
                    <span className="mt-1 block text-13 text-text-2">{o.s}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {mode === "pr" ? (
            <div className="mt-4 grid gap-4">
              <DiffPreview files={files} summary={m.diffPreview?.summary ?? `${files.length} files added`} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-panel border border-line-2 bg-surface p-4">
                {prUrl ? (
                  <>
                    <span className="k-tag k-tag-pass">pr opened</span>
                    <a href={prUrl} target="_blank" rel="noreferrer" className="k-link inline-flex min-w-0 items-center gap-1.5 font-mono text-13">
                      <span className="truncate">{prUrl.replace(/^https:\/\/github\.com\//, "")}</span>
                      <ArrowUpRight className="size-3.5 shrink-0" />
                    </a>
                    <span className="text-13 text-text-3">Review and merge it on GitHub, then deploy.</span>
                  </>
                ) : (
                  <>
                    <Button onClick={() => pr.mutate(undefined, { onError: (e) => toast({ title: "Couldn’t open the PR", body: errorMessage(e), tone: "block" }) })} busy={pr.isPending}>
                      <GitHubMark />
                      Open PR on GitHub
                    </Button>
                    <span className="min-w-0 flex-1 basis-48 text-13 text-text-3" aria-live="polite">
                      {pr.isPending ? "Opening the pull request through the Kronos GitHub App…" : m.prTitle ?? "Adds the guard, modifiers, timelock routing, tests and a deploy script."}
                    </span>
                  </>
                )}
              </div>
              {pr.isError ? <p className="font-mono text-13 text-block">{errorMessage(pr.error)}</p> : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-panel border border-line-2 bg-surface p-4">
                <Button onClick={download} busy={downloading}>
                  <Download />
                  Download package (.zip)
                </Button>
                <span className="font-mono text-13 text-text-3">
                  {files.length} files · v{pkg.data.version}
                </span>
              </div>
              <div className="overflow-hidden rounded-panel border border-line-2 bg-surface">
                <p className="k-bar">INTEGRATION.md</p>
                <div className="p-5 md:p-6">{integrationMd ? <Markdown source={integrationMd} /> : <p className="text-15 text-text-2">INTEGRATION.md is inside the zip.</p>}</div>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection n="02" title="Sign intents in your frontend" hint="Every user action carries a signed EIP-712 intent. The SDK builds, signs and submits it.">
          <CodeTabs tabs={[{ id: "sdk", label: "@kronos/sdk", code: sdk.trim(), lang: "typescript" }]} />
        </FormSection>

        <FormSection n="03" title="Deploy" hint={`Run the tests, then the generated script against ${chain?.name ?? "your chain"}.`}>
          <CodeTabs tabs={[{ id: "deploy", label: `forge · ${chain?.name ?? "chain"}`, code: deploy, lang: "shellscript" }]} />
        </FormSection>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-8 md:pl-[4.5rem]">
          <ButtonLink href={`/p/${id}/verify`} size="lg">
            I’ve deployed, verify it
            <ArrowRight />
          </ButtonLink>
          <span className="text-13 text-text-3">Kronos checks the deployment on-chain before it goes live.</span>
        </div>
      </div>
    </>,
  );
}
