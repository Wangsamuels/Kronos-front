import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionLabel } from "@/components/ui/Section";
import { GITHUB_URL } from "@/lib/links";

export const metadata: Metadata = { title: "Docs" };
export const dynamic = "force-static";

const SECTIONS = [
  { id: "quickstart", title: "Quickstart", body: "Paste the repo on /connect, sign in with GitHub, start the analysis, approve the review, merge the PR, deploy with the generated forge script, then verify the guard address. The protocol goes live when every on-chain check passes." },
  { id: "guard", title: "The guard modifier", body: "guarded(kind, intent, sig) runs pre-checks (intent signature, nonce, deadline, bounds, attestation freshness, probation), your function body, then post-checks (health, solvency, share price, oracle vs 30m TWAP, caps). Above-threshold outflow is queued, not reverted." },
  { id: "tiers", title: "Admin tiers", body: "Tier 0 instant (tighten only), Tier 1 48 hours, Tier 2 7 days, Tier 3 14 days plus an independent co-sign. The timelock is owned by the guard, not governance. Guardians can cancel, never execute." },
  { id: "attack-library", title: "Attack library", body: "Oracle pump, donation share inflation, rounding loop, reentrancy, fake collateral listing, split withdrawals, admin oracle swap and intent tampering are replayed on an anvil fork for every package. The test suite ships in test/kronos/." },
  { id: "sdk", title: "@kronos/sdk", body: "Builds and signs EIP-712 intents in your frontend: new Kronos({ chainId, guard }), then kronos.borrow({...}) and kronos.submit(intent, walletClient)." },
  { id: "limits", title: "What Kronos doesn’t stop", body: "Phishing signatures, stolen exchange or wallet keys, chain-level bugs, and bugs in the invariants themselves." },
  { id: "source", title: "Source", body: "The integration docs live with the backend and contracts repository." },
  { id: "contact", title: "Contact", body: "Design-partner onboarding is open for lending protocols on Base Sepolia and Aurora testnet." },
];

export default function Docs() {
  return (
    <div data-theme="light" className="min-h-dvh bg-bg text-text">
      <SiteNav />
      <main id="main" className="k-container grid gap-10 py-16 lg:grid-cols-12">
        <nav aria-label="Docs" className="lg:col-span-3">
          <SectionLabel>Docs</SectionLabel>
          <ul className="mt-4 grid gap-2 text-15">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-text-2 hover:text-text">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid gap-10 lg:col-span-8">
          <h1 className="text-44 font-medium">Integrating Kronos</h1>
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20 border-t border-line pt-6">
              <h2 className="text-22 font-medium">{s.title}</h2>
              <p className="mt-3 max-w-2xl text-17 text-text-2">{s.body}</p>
              {s.id === "source" ? (
                <Link href={GITHUB_URL} className="mt-3 inline-block font-mono text-13 underline">
                  {GITHUB_URL.startsWith("http") ? GITHUB_URL : "GitHub link coming with the public repo"}
                </Link>
              ) : null}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
