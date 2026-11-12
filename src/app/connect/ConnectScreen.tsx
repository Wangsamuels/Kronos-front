"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { RepoInput, type RepoValue } from "@/components/RepoInput";
import { AuthPanel } from "@/components/connect/AuthPanel";
import { Waitlist } from "@/components/connect/Waitlist";
import { Button } from "@/components/ui/Button";
import { Field, FormSection, PageHead, StepEyebrow } from "@/components/ui/Page";
import { ArrowRight, Lock, Plus } from "@/components/ui/Icons";
import { useCreateProtocol, useMeta, useSession } from "@/api/queries";
import { errorMessage } from "@/api/errors";
import { ENABLED_CHAINS } from "@/lib/chains";
import { ADDRESS_RE, normalizeUrl, repoError, websiteError } from "@/lib/validate";
import { cn } from "@/lib/cn";

export function ConnectScreen() {
  const sp = useSearchParams();
  const router = useRouter();
  const meta = useMeta();
  const { signedIn } = useSession();
  const create = useCreateProtocol();
  const [v, setV] = useState<RepoValue>({ website: sp.get("website") ?? "", repo: sp.get("repo") ?? "" });
  const chains = meta.data?.chains?.length
    ? meta.data.chains.map((c) => ({ id: c.chainId, name: c.name }))
    : ENABLED_CHAINS.map((c) => ({ id: c.id, name: c.name }));
  const [chainId, setChainId] = useState<number>(ENABLED_CHAINS.find((c) => c.key === "base-sepolia")?.id ?? 84532);
  const types = meta.data?.protocolTypes ?? [{ type: "lending", available: true }, { type: "bridge", available: false }];
  const [ptype, setPtype] = useState("lending");
  const [showAddr, setShowAddr] = useState(false);
  const [addrText, setAddrText] = useState("");
  const addresses = addrText.split(/[\s,]+/).filter(Boolean);
  const badAddr = addresses.filter((a) => !ADDRESS_RE.test(a));
  const available = types.find((t) => t.type === ptype)?.available ?? false;
  const formOk = !repoError(v.repo) && !websiteError(v.website) && badAddr.length === 0;

  const start = async () => {
    if (!formOk) return;
    try {
      const res = await create.mutateAsync({
        websiteUrl: v.website ? normalizeUrl(v.website) : undefined,
        repoUrl: normalizeUrl(v.repo),
        chainId,
        addresses: addresses.length ? addresses : undefined,
      });
      router.push(`/p/${res.protocol.id}/analysis`);
    } catch {}
  };

  const optionClass = (on: boolean) =>
    cn(
      "relative flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-ctl border px-3.5 py-2 text-15 transition-colors duration-k has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text",
      on ? "border-text bg-surface-2 text-text" : "border-line-2 text-text-2 hover:border-text-3 hover:text-text",
    );
  const radioDot = (on: boolean) => (
    <span aria-hidden className={cn("grid size-4 shrink-0 place-items-center rounded-full border", on ? "border-text" : "border-text-3")}>
      <span className={cn("block size-2 rounded-full", on ? "bg-text" : "bg-transparent")} />
    </span>
  );
  const blocker = !signedIn ? "Sign in with GitHub to continue." : !formOk ? (repoError(v.repo) ? "Add a valid GitHub repo." : "Fix the highlighted fields.") : null;

  return (
    <OnboardingShell step="link" wide>
      <PageHead
        eyebrow={<StepEyebrow n={1} label="Link" />}
        title="Link your protocol"
        lede="The repo is the source of truth. A website only adds hints, like deployed addresses and docs."
      />

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="grid content-start gap-8 lg:col-span-7">
          <FormSection n="01" title="Repository" hint="Public or private. Private repos are read through the Kronos GitHub App you install below.">
            <RepoInput value={v} onChange={setV} hideSubmit />
            <div className="-mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                className="k-link text-13"
                onClick={() => setV({ website: "https://minilend.example", repo: "sample://minilend" })}
              >
                Use the MiniLend sample
              </button>
              <button type="button" aria-expanded={showAddr} onClick={() => setShowAddr((s) => !s)} className="inline-flex items-center gap-1.5 text-13 text-text-2 transition-colors duration-k hover:text-text">
                <Plus className={cn("size-3.5 transition-transform duration-k", showAddr && "rotate-45")} />
                Add contract addresses manually
              </button>
            </div>
            {showAddr ? (
              <Field
                className="mt-5"
                label="Contract addresses"
                optional
                htmlFor="addrs"
                error={badAddr.length ? `Not an address: ${badAddr[0]}` : null}
                hint="One per line. Otherwise they are detected from the repo’s deploy files and the website."
              >
                <textarea id="addrs" rows={3} className="k-input h-auto py-2.5" placeholder="0x…" value={addrText} onChange={(e) => setAddrText(e.target.value)} aria-invalid={badAddr.length > 0} spellCheck={false} />
              </Field>
            ) : null}
          </FormSection>

          <FormSection n="02" title="Type and chain" hint="Lending is live. Other types are classified and added to the waitlist.">
            <fieldset>
              <legend className="mb-2.5 text-13 font-medium text-text">Protocol type</legend>
              <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-3">
                {types.map((t) => (
                  <label key={t.type} className={optionClass(ptype === t.type)}>
                    <input type="radio" name="ptype" className="sr-only" checked={ptype === t.type} onChange={() => setPtype(t.type)} />
                    {radioDot(ptype === t.type)}
                    <span className="capitalize">{t.type}</span>
                    <span className={cn("ml-auto font-mono text-11 uppercase tracking-[0.06em]", t.available ? "text-pass" : "text-text-3")}>{t.available ? "live" : "soon"}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {available ? (
              <fieldset className="mt-6">
                <legend className="mb-2.5 text-13 font-medium text-text">Chain</legend>
                <div className="grid gap-2 min-[520px]:grid-cols-2">
                  {chains.map((c) => (
                    <label key={c.id} className={optionClass(chainId === c.id)}>
                      <input type="radio" name="chain" className="sr-only" checked={chainId === c.id} onChange={() => setChainId(c.id)} />
                      {radioDot(chainId === c.id)}
                      {c.name}
                      <span className="k-tnum ml-auto font-mono text-11 text-text-3">{c.id}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <Waitlist className="mt-6" protocolType={ptype} />
            )}
          </FormSection>

          {available ? (
            <>
              <FormSection n="03" title="Access" hint="Asked only here, and only what the analysis needs.">
                <AuthPanel chainId={chainId} />
              </FormSection>

              <div className="grid gap-3 border-t border-line pt-8 md:pl-[4.5rem]">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Button size="lg" onClick={start} disabled={!formOk || !signedIn} busy={create.isPending}>
                    Start analysis
                    <ArrowRight />
                  </Button>
                  <span className="text-13 text-text-3" aria-live="polite">
                    {blocker ?? "Takes a few minutes. You can leave and come back."}
                  </span>
                </div>
                {create.isError ? (
                  <p role="alert" className="font-mono text-13 text-block">
                    {errorMessage(create.error)}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="sticky top-24 grid gap-6">
            <div className="rounded-panel border border-line-2 bg-surface">
              <p className="k-bar">What happens next</p>
              <ol className="px-5 py-2">
                {[
                  ["Analyze", "Agents map entry points and draft invariants. A red team attacks them on a fork. You watch the log live."],
                  ["Review", "You approve each rule, bound and admin tier."],
                  ["Integrate", "Kronos opens one pull request with the guard, tests and deploy script."],
                  ["Verify", "On-chain checks pass, the guard goes live."],
                ].map(([t, d], i) => (
                  <li key={t} className="grid grid-cols-[2rem_1fr] border-b border-line/70 py-4 last:border-b-0">
                    <span className="font-mono text-11 leading-6 text-text-3">0{i + 2}</span>
                    <span>
                      <span className="block text-15 font-medium text-text">{t}</span>
                      <span className="mt-0.5 block text-13 text-text-2">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="flex items-start gap-2.5 text-13 text-text-3">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              Nothing changes in your repo or on-chain until your team approves the review and merges the pull request.
            </p>
          </div>
        </aside>
      </div>
    </OnboardingShell>
  );
}
