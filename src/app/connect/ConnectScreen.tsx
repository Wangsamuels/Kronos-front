"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OnboardingShell } from "@/components/OnboardingShell";
import { RepoInput, type RepoValue } from "@/components/RepoInput";
import { AuthPanel } from "@/components/connect/AuthPanel";
import { Waitlist } from "@/components/connect/Waitlist";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Section";
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

  return (
    <OnboardingShell step="link">
      <SectionLabel>Step 1 of 5 · Link</SectionLabel>
      <h1 className="mt-3 text-32 font-medium">Link your protocol</h1>
      <p className="mt-2 text-15 text-text-2">The repo is the source of truth. The website only adds hints, like deployed addresses and docs.</p>

      <div className="mt-8 grid gap-8">
        <RepoInput value={v} onChange={setV} hideSubmit />
        <button type="button" className="-mt-6 w-fit font-mono text-13 text-text-3 underline-offset-4 hover:text-text hover:underline" onClick={() => setV({ website: "https://minilend.example", repo: "sample://minilend" })}>
          or use the MiniLend sample
        </button>

        <fieldset>
          <legend className="k-label mb-3">Protocol type</legend>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <label key={t.type} className={cn("flex h-11 cursor-pointer items-center gap-2 rounded-ctl border px-3 text-13", ptype === t.type ? "border-text bg-surface-2 text-text" : "border-line text-text-2 hover:border-text-3")}>
                <input type="radio" name="ptype" className="sr-only" checked={ptype === t.type} onChange={() => setPtype(t.type)} />
                <span className="capitalize">{t.type}</span>
                <span className={cn("font-mono text-11", t.available ? "text-pass" : "text-text-3")}>{t.available ? "live" : "waitlist"}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {!available ? (
          <Waitlist protocolType={ptype} />
        ) : (
          <>
            <fieldset>
              <legend className="k-label mb-3">Chain</legend>
              <div className="flex flex-wrap gap-2">
                {chains.map((c) => (
                  <label key={c.id} className={cn("flex h-11 cursor-pointer items-center gap-2 rounded-ctl border px-3 text-13", chainId === c.id ? "border-text bg-surface-2 text-text" : "border-line text-text-2 hover:border-text-3")}>
                    <input type="radio" name="chain" className="sr-only" checked={chainId === c.id} onChange={() => setChainId(c.id)} />
                    {c.name}
                    <span className="font-mono text-11 text-text-3">{c.id}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <button type="button" aria-expanded={showAddr} onClick={() => setShowAddr((s) => !s)} className="font-mono text-13 text-text-2 hover:text-text">
                {showAddr ? "− " : "+ "}Add addresses manually
              </button>
              {showAddr ? (
                <div className="mt-3">
                  <label htmlFor="addrs" className="k-label">
                    Contract addresses, one per line
                  </label>
                  <textarea
                    id="addrs"
                    rows={3}
                    className="k-input mt-2 h-auto py-2"
                    placeholder="0x…"
                    value={addrText}
                    onChange={(e) => setAddrText(e.target.value)}
                    aria-invalid={badAddr.length > 0}
                  />
                  <p className={cn("mt-1 font-mono text-11", badAddr.length ? "text-block" : "text-text-3")}>
                    {badAddr.length ? `Not an address: ${badAddr[0]}` : "Otherwise detected from the repo's deploy files and the website."}
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <SectionLabel className="mb-3">Access</SectionLabel>
              <AuthPanel chainId={chainId} />
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
              <Button size="lg" onClick={start} disabled={!formOk || !signedIn} busy={create.isPending}>
                Start analysis
              </Button>
              <span className="text-13 text-text-3">{!signedIn ? "Continue with GitHub first." : !formOk ? "Fix the fields above." : "Takes a few minutes. You can leave and come back."}</span>
            </div>
            {create.isError ? (
              <p role="alert" className="font-mono text-13 text-block">
                {errorMessage(create.error)}
              </p>
            ) : null}
          </>
        )}
      </div>
    </OnboardingShell>
  );
}
