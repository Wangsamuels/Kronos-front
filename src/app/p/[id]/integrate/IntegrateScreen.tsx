"use client";
import { useState } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { DiffPreview } from "@/components/integrate/DiffPreview";
import { Markdown } from "@/components/integrate/Markdown";
import { CodeTabs } from "@/components/code/CodeTabs";
import Link from "next/link";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { FormSection, Notice, PageHead, StepEyebrow } from "@/components/ui/Page";
import { ArrowRight, ArrowUpRight, Download, GitHubMark } from "@/components/ui/Icons";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useOpenPr, useProtocol, useProviders, useRunPackage } from "@/api/queries";
import { api, apiUrl } from "@/api/client";
import { ensureToken } from "@/api/auth";
import { USE_MOCKS } from "@/lib/env";
import { githubStartUrl } from "@/components/auth/AuthModal";
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
  const providers = useProviders();

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

  /**
   * downloadUrl is usually a signed storage link valid for an hour: use it as is, and fetch the
   * package again for a fresh one rather than reusing an old link. When it points at the API
   * (/v1/packages/…/download) a plain link cannot send headers, so the access token goes in the query.
   */
  const download = async () => {
    setDownloading(true);
    try {
      if (USE_MOCKS) {
        const { data, response } = await api.GET("/v1/packages/{id}/download", { params: { path: { id: pkg.data!.id }, query: {} }, parseAs: "blob" });
        if (!response.ok || !data) throw new ApiError(response.status, `HTTP_${response.status}`, "Download failed");
        const url = URL.createObjectURL(data as Blob);
        save(url);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }
      const fresh = (await pkg.refetch()).data ?? pkg.data!;
      let url = fresh.downloadUrl;
      const apiPath = url.match(/\/v1\/packages\/[^?#]+\/download.*/)?.[0];
      if (apiPath) {
        const token = await ensureToken();
        if (!token) throw new ApiError(401, "UNAUTHENTICATED", "Sign in again to download the package");
        url = `${apiUrl(apiPath)}${apiPath.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
      }
      save(url);
    } catch (e) {
      toast({ title: "Download failed", body: errorMessage(e), tone: "block" });
    } finally {
      setDownloading(false);
    }
  };
  const save = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `kronos-package-${pkg.data!.version}.zip`;
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /** Pull-request failures the reader can act on, by error code. */
  const prError = pr.error instanceof ApiError ? pr.error : null;
  const prHelp: { text: string; install?: boolean } | null = !prError
    ? null
    : prError.code === "NO_GITHUB_REPO"
      ? { text: "This protocol was linked by contract address, so there is no repo to open a pull request on. Use the manual download instead." }
      : prError.code === "GITHUB_APP_NOT_CONFIGURED"
        ? { text: "Pull requests are switched off on this backend. Use the manual download instead." }
        : prError.code === "GITHUB_ERROR"
          ? { text: "GitHub refused the pull request. Usually the Kronos GitHub App is not installed on this repo yet.", install: true }
          : { text: errorMessage(prError) };
  const installApp = () => {
    const start = providers.data?.github.startUrl;
    if (start) window.location.href = githubStartUrl(start, window.location.pathname, { install: true });
  };
  const copyHash = () =>
    void navigator.clipboard?.writeText(pkg.data!.configHash).then(() => toast({ title: "Config hash copied", body: pkg.data!.configHash, tone: "neutral" }));

  return shell(
    <>
      <PageHead
        eyebrow={<StepEyebrow n={4} label="Integrate" />}
        title="Merge the guard into your repo"
        lede="Three things to do: merge the package, sign intents in your frontend, and deploy. Then Kronos verifies the result on-chain."
        right={
          <p className="flex flex-wrap items-center gap-2 font-mono text-11 text-text-3">
            <span className="k-tag k-tag-idle">package {ver(pkg.data.version)}</span>
            <button type="button" onClick={copyHash} title="Copy the full config hash" className="rounded-[4px] px-1 transition-colors duration-k hover:bg-surface-2 hover:text-text">
              config {pkg.data.configHash.slice(0, 10)}…{pkg.data.configHash.slice(-4)} · copy
            </button>
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
                    <a href={prUrl} target="_blank" rel="noreferrer" className={buttonClass("primary", "md")}>
                      <GitHubMark />
                      View PR
                      <ArrowUpRight className="size-3.5" />
                    </a>
                    <span className="k-tag k-tag-pass">pr opened</span>
                    <span className="min-w-0 truncate font-mono text-13 text-text-3">{prUrl.replace(/^https:\/\/github\.com\//, "")}</span>
                  </>
                ) : (
                  <>
                    <Button onClick={() => pr.mutate()} busy={pr.isPending}>
                      <GitHubMark />
                      Open integration PR
                    </Button>
                    <span className="min-w-0 flex-1 basis-48 text-13 text-text-3" aria-live="polite">
                      {pr.isPending ? "Opening the pull request through the Kronos GitHub App…" : m.prTitle ?? "Adds the guard, modifiers, timelock routing, tests and a deploy script."}
                    </span>
                  </>
                )}
              </div>
              {pr.isError && !prUrl ? (
                <Notice role="alert" tone="block" word={prError?.code === "GITHUB_ERROR" ? "github" : "not opened"}>
                  <p>{prHelp?.text ?? errorMessage(pr.error)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {prHelp?.install && providers.data?.github.enabled ? (
                      <Button size="sm" onClick={installApp}>
                        <GitHubMark />
                        Install the Kronos GitHub App
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => setMode("manual")}>
                      Download the package instead
                    </Button>
                  </div>
                </Notice>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-panel border border-line-2 bg-surface p-4">
                <Button onClick={download} busy={downloading}>
                  <Download />
                  Download package (.zip)
                </Button>
                <span className="font-mono text-13 text-text-3">
                  {files.length} files · {ver(pkg.data.version)}
                </span>
              </div>
              <div className="overflow-hidden rounded-panel border border-line-2 bg-surface">
                <p className="k-bar">INTEGRATION.md</p>
                <div className="p-5 md:p-6">{integrationMd ? <Markdown source={integrationMd} /> : <p className="text-15 text-text-2">INTEGRATION.md is inside the zip.</p>}</div>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection n="02" title="Sign intents in your frontend" hint="Every user action carries a signed EIP-712 intent. The SDK builds, signs and submits it. submit() adds 30% gas headroom over eth_estimateGas, because the guard runs its checks after your protocol call. If you build guarded transactions yourself, add the same margin or wallets that send the bare estimate can run out of gas.">
          <CodeTabs tabs={[{ id: "sdk", label: "@kronos/sdk", code: sdk.trim(), lang: "typescript" }]} />
        </FormSection>

        <FormSection n="03" title="Deploy" hint={`Deploy with the included Foundry script on ${chain?.name ?? "your chain"}, then register the deployment. Kronos is live on a chain once its deployment is registered and verified.`}>
          <CodeTabs tabs={[{ id: "deploy", label: `forge · ${chain?.name ?? "chain"}`, code: deploy, lang: "shellscript" }]} />
        </FormSection>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-8 md:pl-[4.5rem]">
          <ButtonLink href={`/p/${id}/verify`} size="lg">
            I’ve deployed, register it
            <ArrowRight />
          </ButtonLink>
          <span className="text-13 text-text-3">
            Kronos checks the contracts on-chain before the guard goes live. Already live?{" "}
            <Link href={`/p/${id}`} className="k-link">
              Open the dashboard
            </Link>
          </span>
        </div>
      </div>
    </>,
  );
}

/** "1.0.0" and "v1-3be44e" both read as "v…". */
function ver(v: string) {
  return v.startsWith("v") ? v : `v${v}`;
}
