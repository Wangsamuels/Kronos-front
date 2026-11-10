import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RepoInput } from "@/components/RepoInput";
import { SectionLabel } from "@/components/ui/Section";
import { LazyTrace } from "@/components/home/LazyTrace";
import { ReplayStrip } from "@/components/home/ReplayStrip";
import { HowItWorks } from "@/components/home/HowItWorks";
import { HeroRain } from "@/components/home/HeroRain";
import { GuardFlow } from "@/components/home/GuardFlow";
import { AdminTimeline } from "@/components/home/AdminTimeline";
import { CodeTabs, type CodeTab } from "@/components/code/CodeTabs";
import { highlight } from "@/lib/shiki";

export const dynamic = "force-static";

const SOLIDITY = `import {KronosGuard} from "@kronos/contracts/KronosGuard.sol";

contract GuardedMiniLend is MiniLend, KronosGuard, GuardConfigMiniLend {
    function borrow(Intent calldata intent, bytes calldata sig)
        external
        guarded(Kind.Borrow, intent, sig)   // pre-checks → body → post-checks
    {
        _borrow(intent.account, intent.asset, intent.amount);
    }
}`;
const SDK = `import { Kronos } from "@kronos/sdk";

const kronos = new Kronos({ chainId, guard: GUARD_ADDRESS });
const intent = await kronos.borrow({ asset: USDC, amount, maxLTV: 0.7, minHealth: 1.2 });
await kronos.submit(intent, walletClient);`;
const DEPLOY = `forge test --match-path 'test/kronos/*'
forge script script/DeployKronos.s.sol --rpc-url $RPC_BASE_SEPOLIA --broadcast
# then: Kronos → Verify → paste the guard address → LIVE`;

const PROTOCOL_TYPES = [
  { type: "Lending", state: "live MVP", tone: "text-pass", note: "Compound- and Aave-style markets: health, solvency, share price, oracle, caps" },
  { type: "Bridges", state: "next", tone: "text-queue", note: "Mint/lock parity, message replay, relayer key changes" },
  { type: "DEXs and perps", state: "later", tone: "text-text-3", note: "Pool invariants, funding and mark-price sanity" },
  { type: "Vaults and restaking", state: "later", tone: "text-text-3", note: "Share price, withdrawal queues, operator changes" },
];

export default async function Home() {
  const tabs: CodeTab[] = await Promise.all(
    [
      { id: "sol", label: "Solidity modifier", code: SOLIDITY, lang: "solidity" as const },
      { id: "sdk", label: "SDK intent", code: SDK, lang: "typescript" as const },
      { id: "deploy", label: "Deploy and verify", code: DEPLOY, lang: "shellscript" as const },
    ].map(async (t) => ({ ...t, html: await highlight(t.code, t.lang) })),
  );

  return (
    <>
      <SiteNav />
      <main id="main">
        {/* 1 — Hero */}
        <section className="k-container">
          <div className="relative isolate overflow-hidden border-x border-b border-line">
            <HeroRain />
            <div className="relative grid gap-12 px-5 pb-16 pt-16 md:px-8 lg:grid-cols-12 lg:pb-20 lg:pt-24">
              <div className="lg:col-span-6">
                <p className="k-label mb-6">Security layer for DeFi protocols</p>
                <h1 className="text-44 font-medium md:text-64">
                  Every action passes the guard. Even your own.
                </h1>
                <p className="mt-6 max-w-[34rem] text-17 text-text-2">
                  Paste your repo. Kronos maps every entry point, writes the invariants, attacks them on a fork, and hands you a guard you merge in one PR.
                </p>
                <div className="mt-8 max-w-[30rem] bg-bg">
                  <RepoInput hint="Lending only today. Bridges next." />
                </div>
              </div>
              <div className="self-center lg:col-span-6 lg:pl-8">
                <LazyTrace />
              </div>
            </div>
          </div>
        </section>

        {/* 2 — Replay strip */}
        <section className="k-container py-20" aria-labelledby="replays">
          <SectionLabel n="01" as="h2">
            <span id="replays">Replayed attacks</span>
          </SectionLabel>
          <p className="mb-6 mt-3 max-w-2xl text-15 text-text-2">Attack patterns modeled on 2026 incidents, replayed on an anvil fork of the MiniLend sample. Results come from the fork tests.</p>
          <ReplayStrip />
        </section>

        {/* 3 — How it works */}
        <section id="how-it-works" className="k-container scroll-mt-20 border-t border-line py-20">
          <SectionLabel n="02" as="h2">How it works</SectionLabel>
          <h2 className="mb-10 mt-3 max-w-2xl text-32 font-medium">Four steps from repo to a guard that is live on-chain.</h2>
          <HowItWorks />
        </section>

        {/* 4 — The guard */}
        <section id="the-guard" className="k-container scroll-mt-20 border-t border-line py-20">
          <SectionLabel n="03" as="h2">The guard</SectionLabel>
          <h2 className="mb-10 mt-3 max-w-2xl text-32 font-medium">One modifier on every entry point. It judges state, not transaction size.</h2>
          <GuardFlow />
        </section>

        {/* 5 — Admin strategy */}
        <section className="k-container border-t border-line py-20">
          <SectionLabel n="04" as="h2">Safer instantly, riskier slowly</SectionLabel>
          <h2 className="mb-10 mt-3 max-w-2xl text-32 font-medium">Admins change settings. They never move funds, and risk waits.</h2>
          <AdminTimeline />
        </section>

        {/* 6 — Coverage */}
        <section id="coverage" className="k-container scroll-mt-20 border-t border-line py-20">
          <SectionLabel n="05" as="h2">What it stops and what it doesn’t</SectionLabel>
          <div className="mt-8 grid gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-2">
            <div className="bg-bg p-6">
              <p className="font-mono text-13 text-pass">stops</p>
              <ul className="mt-4 grid gap-3 text-17 text-text">
                <li>Oracle manipulation</li>
                <li>Accounting bugs: share inflation, rounding, insolvency</li>
                <li>Unsafe admin changes, including your own keys</li>
                <li>Drains through old approvals</li>
                <li>Split withdrawals under a per-tx cap (queued)</li>
              </ul>
              <p className="mt-6 text-13 text-text-3">About 98% of named March–November 2026 smart-contract hack dollars (≈$140M across 13 incidents), once the admin strategy is included.</p>
            </div>
            <div className="bg-bg p-6">
              <p className="font-mono text-13 text-block">doesn’t stop</p>
              <ul className="mt-4 grid gap-3 text-17 text-text">
                <li>Phishing signatures: a user signing a malicious intent</li>
                <li>Exchange or wallet key theft</li>
                <li>Chain-level bugs</li>
                <li>Bugs in the invariants themselves</li>
              </ul>
              <p className="mt-6 text-13 text-text-3">Keep audits and fork tests in your release process.</p>
            </div>
          </div>
        </section>

        {/* Protocol coverage roadmap: multi-protocol, lending first */}
        <section className="k-container border-t border-line py-20">
          <SectionLabel n="06" as="h2">Protocol types</SectionLabel>
          <h2 className="mb-8 mt-3 max-w-2xl text-32 font-medium">Built for many protocol types. Lending ships first.</h2>
          <div role="table" aria-label="Protocol types" className="border-t border-line">
            {PROTOCOL_TYPES.map((p) => (
              <div role="row" key={p.type} className="grid gap-2 border-b border-line py-4 md:grid-cols-12 md:gap-4">
                <span role="cell" className="text-17 text-text md:col-span-3">{p.type}</span>
                <span role="cell" className={`font-mono text-13 md:col-span-2 ${p.tone}`}>{p.state}</span>
                <span role="cell" className="text-15 text-text-2 md:col-span-7">{p.note}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-13 text-text-3">Not lending? Paste the repo anyway: we classify it and add you to the waitlist for your type.</p>
        </section>

        {/* 7 — For developers */}
        <section className="k-container border-t border-line py-20">
          <SectionLabel n="07" as="h2">Integration</SectionLabel>
          <h2 className="mb-8 mt-3 max-w-2xl text-32 font-medium">A modifier, a four-line SDK call, one deploy command.</h2>
          <CodeTabs tabs={tabs} />
        </section>

        {/* 8 — Footer CTA */}
        <section className="k-container border-t border-line py-20">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="text-32 font-medium">Paste the repo. Watch the analysis run.</h2>
              <p className="mt-3 text-15 text-text-2">Analysis takes minutes. Nothing ships until your team approves every rule.</p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <RepoInput hint="Lending only today. Bridges next." />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
