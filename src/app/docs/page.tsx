import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Eyebrow, PageHead } from "@/components/ui/Page";
import { GITHUB_URL } from "@/lib/links";

export const metadata: Metadata = { title: "Docs" };
export const dynamic = "force-static";

const SECTIONS = [
  { id: "quickstart", title: "Quickstart", body: "Paste the repo on /connect, sign in with GitHub, start the analysis, approve the review, merge the PR, deploy with the generated forge script, then verify the guard address. The protocol goes live when every on-chain check passes." },
  { id: "guard", title: "The guard modifier", body: "guarded(kind, intent, sig) runs pre-checks (intent signature, nonce, deadline, bounds, attestation freshness, probation), your function body, then post-checks (health, solvency, share price, oracle vs 30m TWAP, caps). Above-threshold outflow is queued, not reverted." },
  { id: "tiers", title: "Admin tiers", body: "Risky admin changes wait in public before they can run: Tier 0 instant (tighten only), Tier 1 48 hours, Tier 2 7 days, Tier 3 14 days plus an independent co-sign. The waiting queue (a timelock contract) is owned by the guard, not governance. Guardians can cancel, never execute." },
  { id: "near", title: "The monitor and NEAR", body: "The monitor acts through one NEAR function-call key limited to the registry’s tighten method. For EVM chains, the registry builds the outflow tighten itself and NEAR’s MPC network signs it (Chain Signatures), so Kronos holds no EVM key. Deploy the guard with the protocol’s Chain Signatures address as MONITOR_ADDRESS; the Verify step and the dashboard show whether each chain uses it. Chain Signatures covers outflow tightens only. Everything runs on testnet: Aurora testnet, Base Sepolia and NEAR testnet." },
  { id: "attack-library", title: "Attack library", body: "Oracle pump, donation share inflation, rounding loop, reentrancy, fake collateral listing, split withdrawals, admin oracle swap and intent tampering are replayed on an anvil fork for every package. The test suite ships in test/kronos/." },
  { id: "sdk", title: "@kronos/sdk", body: "Builds and signs EIP-712 intents in your frontend: new Kronos({ chainId, guard }), then kronos.borrow({...}) and kronos.submit(intent, walletClient)." },
  { id: "limits", title: "What Kronos doesn’t stop", body: "Phishing signatures, stolen exchange or wallet keys, chain-level bugs, and bugs in the invariants themselves." },
  { id: "source", title: "Source", body: "The integration docs live with the backend and contracts repository." },
  { id: "contact", title: "Contact", body: "Design-partner onboarding is open for lending protocols on Aurora testnet and Base Sepolia." },
];

export default function Docs() {
  return (
    <div data-theme="light" className="min-h-dvh bg-bg text-text">
      <SiteNav />
      <main id="main" className="k-container pb-24 pt-12 md:pt-16">
        <PageHead eyebrow={<Eyebrow>Docs</Eyebrow>} title="Integrating Kronos" lede="How the guard works, how to merge it, and exactly where its coverage ends." />
        <div className="mt-12 grid gap-10 border-t border-line pt-10 lg:grid-cols-12">
          <nav aria-label="Docs" className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <p className="k-label">On this page</p>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-0.5 lg:grid lg:gap-0">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="group flex min-h-9 items-center gap-3 text-15 text-text-2 transition-colors duration-k hover:text-text">
                      <span className="k-tnum hidden font-mono text-11 text-text-3 lg:inline">{String(i + 1).padStart(2, "0")}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
          <div className="lg:col-span-8 lg:col-start-5">
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-line py-9 first:border-t-0 first:pt-0">
                <p className="k-tnum font-mono text-11 text-text-3">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[-0.02em]">{s.title}</h2>
                <p className="mt-4 max-w-[42rem] text-17 leading-[1.65] text-text-2">{s.body}</p>
                {s.id === "source" ? (
                  <Link href={GITHUB_URL} className="k-link mt-4 inline-block font-mono text-13">
                    {GITHUB_URL.startsWith("http") ? GITHUB_URL : "GitHub link coming with the public repo"}
                  </Link>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
