import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RepoInput } from "@/components/RepoInput";
import Link from "next/link";
import { SectionHead } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { Check, Cross } from "@/components/ui/Icons";
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
  { type: "Lending", state: "live MVP", tag: "k-tag-pass", note: "Compound- and Aave-style markets: health, solvency, share price, oracle, caps." },
  { type: "Bridges", state: "next", tag: "k-tag-queue", note: "Mint/lock parity, message replay, relayer key changes." },
  { type: "DEXs and perps", state: "later", tag: "k-tag-idle", note: "Pool invariants, funding and mark-price sanity." },
  { type: "Vaults and restaking", state: "later", tag: "k-tag-idle", note: "Share price, withdrawal queues, operator changes." },
];

/** Every number here is checked by the backend's own suite (forge tests, fork replays, verify step). */
const PROOF = [
  { value: "6/6", label: "attack replays stopped on a fork" },
  { value: "28", label: "Foundry tests in the guard suite" },
  { value: "30/30", label: "on-chain checks before a guard goes live" },
  { value: "1 PR", label: "to integrate: guard, tests, deploy script" },
];

const STOPS = [
  "Oracle manipulation",
  "Accounting bugs: share inflation, rounding, insolvency",
  "Unsafe admin changes, including from your own keys",
  "Drains through old approvals",
  "Split withdrawals under a per-transaction cap (queued)",
];
const DOESNT = [
  "Phishing: a user signing a malicious intent",
  "Exchange or wallet key theft",
  "Chain-level bugs",
  "Bugs in the invariants themselves",
];

const INTEGRATION_POINTS = [
  { k: "Contracts", v: "Wrap each entry point in one modifier. Your function bodies run unchanged." },
  { k: "Frontend", v: "Build and sign the intent with the SDK. Exact-amount approvals only." },
  { k: "Deploy", v: "Run the generated forge script, paste the guard address, go live when every check passes." },
];

const sampleHint = (
  <>
    Lending today, bridges next. No repo handy?{" "}
    <Link href="/connect?repo=sample://minilend" className="k-link whitespace-nowrap">
      Run the MiniLend sample
    </Link>
  </>
);

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
      <main id="main" className="md:px-8">
        <div className="k-frame">
          {/* 1 — Hero */}
          <section className="relative isolate overflow-hidden">
            <HeroRain />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(70%_100%_at_30%_0%,rgb(var(--text)/0.07),transparent_70%)]" />
            <div className="k-pad relative pb-14 pt-14 md:pb-20 md:pt-20 lg:pt-24">
              <p className="k-chip">
                <span className="relative flex size-1.5">
                  <span aria-hidden className="absolute inset-0 animate-k-ping rounded-full bg-pass" />
                  <span aria-hidden className="relative block size-1.5 rounded-full bg-pass" />
                </span>
                Live on Base Sepolia + Aurora testnet
              </p>
              <h1 className="mt-7 max-w-[15ch] text-display font-medium text-text md:max-w-none">
                Exploits revert.
                <br className="hidden md:block" /> <span className="text-text-3">Everything else goes through.</span>
              </h1>

              <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-5">
                  <p className="max-w-[32rem] text-lede text-text-2">
                    Kronos is an on-chain guard for lending protocols. It checks every action against your protocol’s own invariants, inside the same transaction. Users, attackers and your own admin keys all get the same treatment.
                  </p>
                  <div className="mt-8 max-w-[32rem]">
                    <RepoInput variant="inline" submitLabel="Analyze repo" hint={sampleHint} />
                  </div>
                  <ul className="mt-8 grid max-w-[32rem] gap-2.5 text-15 text-text-2">
                    {["Analysis runs in minutes", "Nothing ships until your team approves every rule", "You merge it as one pull request"].map((t) => (
                      <li key={t} className="flex items-center gap-3">
                        <Check className="size-3.5 shrink-0 text-pass" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:col-span-7 lg:pl-4">
                  <LazyTrace />
                </div>
              </div>
            </div>

            {/* proof strip */}
            <dl className="relative grid grid-cols-2 border-t border-line bg-bg lg:grid-cols-4">
              {PROOF.map((p, i) => (
                <div key={p.label} className={`px-5 py-6 md:px-10 lg:px-8 lg:py-8 xl:px-14 ${i % 2 ? "border-l border-line" : ""} ${i > 1 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
                  <dt className="sr-only">{p.label}</dt>
                  <dd>
                    <span className="k-tnum block font-mono text-[28px] leading-none tracking-[-0.03em] text-text md:text-32">{p.value}</span>
                    <span className="mt-2.5 block text-13 text-text-2">{p.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 2 — Attack ledger */}
          <section className="k-section" aria-labelledby="replays">
            <SectionHead
              n="01"
              label="Attack ledger"
              id="replays"
              title="Six attack patterns from 2026. None of them moved funds."
              lede="Each one is modeled on a real incident and replayed on an anvil fork of the MiniLend sample. The verdicts come from the fork tests, and every row links to its test."
            />
            <ReplayStrip />
          </section>

          {/* 3 — How it works */}
          <section id="how-it-works" className="k-section scroll-mt-16">
            <SectionHead n="02" label="How it works" title="From a pasted repo to a live guard in four steps." lede="AI drafts the rules. Fork tests prove them. Your team signs off. Agents agreeing with each other counts for nothing; the compiler decides." />
            <Reveal>
              <HowItWorks />
            </Reveal>
          </section>

          {/* 4 — The guard */}
          <section id="the-guard" className="k-section scroll-mt-16">
            <SectionHead n="03" label="The guard" title="One modifier, two doors. Nobody skips the checks." lede="Users arrive with a signed intent. Admins arrive through the timelock. Both hit the same five stages, and the guard judges the resulting state, not the size of the transaction." />
            <Reveal>
              <GuardFlow />
            </Reveal>
          </section>

          {/* 5 — Admin strategy */}
          <section className="k-section">
            <SectionHead n="04" label="Admin keys" title="Safer is instant. Riskier has to wait." lede="Admins change settings and never move funds. Tightening applies immediately. Anything that adds risk sits in a public queue, where a guardian can cancel it and nobody can rush it." />
            <Reveal>
              <AdminTimeline />
            </Reveal>
          </section>

          {/* 6 — Coverage */}
          <section id="coverage" className="k-section scroll-mt-16">
            <SectionHead n="05" label="Coverage" title="What it stops, and what it doesn’t." lede="A guard is one layer. Here is exactly where this one ends, so you know what still needs an audit." />
            <Reveal className="grid gap-px overflow-hidden rounded-panel border border-line-2 bg-line lg:grid-cols-12">
              <div className="flex flex-col justify-between gap-10 bg-surface p-6 md:p-8 lg:col-span-4">
                <p className="k-label">Share of 2026 losses in scope</p>
                <div>
                  <p className="k-tnum font-mono text-[64px] leading-none tracking-[-0.05em] text-text md:text-[80px]">
                    ≈98<span className="text-text-3">%</span>
                  </p>
                  <p className="mt-4 max-w-xs text-15 text-text-2">of named smart-contract hack dollars, March to November 2026. About $140M across 13 incidents.</p>
                </div>
              </div>
              <div className="bg-bg p-6 md:p-8 lg:col-span-4">
                <p className="k-tag k-tag-pass">stops</p>
                <ul className="mt-6 grid gap-4 text-17 text-text">
                  {STOPS.map((t) => (
                    <li key={t} className="flex gap-3">
                      <Check className="mt-1.5 size-3.5 shrink-0 text-pass" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-bg p-6 md:p-8 lg:col-span-4">
                <p className="k-tag k-tag-idle">doesn’t stop</p>
                <ul className="mt-6 grid gap-4 text-17 text-text-2">
                  {DOESNT.map((t) => (
                    <li key={t} className="flex gap-3">
                      <Cross className="mt-1.5 size-3.5 shrink-0 text-text-3" />
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-8 border-t border-line pt-4 text-13 text-text-3">Keep audits and fork tests in your release process.</p>
              </div>
            </Reveal>
          </section>

          {/* Protocol coverage roadmap: multi-protocol, lending first */}
          <section className="k-section">
            <SectionHead n="06" label="Protocol types" title="Lending ships first. The same guard model carries to the rest." lede="Not a lending protocol? Paste the repo anyway. We classify it and put you on the waitlist for your type." />
            <Reveal>
              <ul aria-label="Protocol types" className="border-b border-line">
                {PROTOCOL_TYPES.map((p) => (
                  <li key={p.type} className="grid gap-x-6 gap-y-2 border-t border-line py-5 md:grid-cols-12 md:items-center md:px-3">
                    <span className={`text-22 font-medium md:col-span-4 ${p.state === "later" ? "text-text-2" : "text-text"}`}>{p.type}</span>
                    <span className="md:col-span-2">
                      <span className={`k-tag ${p.tag}`}>{p.state}</span>
                    </span>
                    <span className="text-15 text-text-2 md:col-span-6">{p.note}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>

          {/* 7 — For developers */}
          <section className="k-section">
            <SectionHead n="07" label="Integration" title="A modifier, four lines of SDK, one deploy command." />
            <Reveal className="grid gap-8 lg:grid-cols-12 lg:gap-10">
              <ol className="grid content-start lg:col-span-4">
                {INTEGRATION_POINTS.map((p, i) => (
                  <li key={p.k} className="grid grid-cols-[2.5rem_1fr] border-t border-line py-5 last:border-b">
                    <span className="font-mono text-11 leading-6 text-text-3">0{i + 1}</span>
                    <span>
                      <span className="block text-17 font-medium text-text">{p.k}</span>
                      <span className="mt-1 block text-15 text-text-2">{p.v}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="min-w-0 lg:col-span-8">
                <CodeTabs tabs={tabs} />
              </div>
            </Reveal>
          </section>

          {/* 8 — Closing CTA */}
          <section className="k-rule relative isolate overflow-hidden">
            <div aria-hidden className="k-grid-bg pointer-events-none absolute inset-0 -z-10" />
            <div className="k-pad py-20 md:py-28">
              <p className="k-label">Start here</p>
              <h2 className="mt-5 max-w-[18ch] text-display font-medium text-text">Paste the repo. Watch the red team work.</h2>
              <p className="mt-5 max-w-[34rem] text-lede text-text-2">You get a live log of every entry point mapped, every invariant drafted and every attack replayed. Nothing ships until your team approves every rule.</p>
              <div className="mt-9 max-w-[34rem]">
                <RepoInput variant="inline" submitLabel="Analyze repo" hint={sampleHint} />
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
