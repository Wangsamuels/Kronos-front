import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow, PageHead } from "@/components/ui/Page";
import { ArrowRight, ArrowUpRight, Cross } from "@/components/ui/Icons";
import { NEAR_MPC_SIGNER, NEAR_REGISTRY, SAMPLE_TIGHTEN_EVM_TX, SAMPLE_TIGHTEN_EVM_URL, SAMPLE_TIGHTEN_NEAR_TX, nearAccountUrl, nearTxUrl } from "@/lib/links";

export const metadata: Metadata = {
  title: "Why NEAR",
  description: "Kronos is a security layer for lending protocols. NEAR is what makes its safety guarantees possible: enclave AI, cheap enforcement on Aurora, method-scoped keys and Chain Signatures.",
};
export const dynamic = "force-static";

const PIECES = [
  {
    layer: "1 · Analyze",
    near: "NEAR AI Cloud",
    guarantee: "Nobody can quietly swap the model that wrote your rules.",
    how: "Two independent AI models draft the invariants inside a hardware enclave (TEE) on NEAR AI Cloud. Each run records which models it used and the enclave’s attestation. Where the models disagree, the rule comes to you. The AI never decides alone: your team approves every rule.",
  },
  {
    layer: "2 · Enforce",
    near: "Aurora, NEAR’s EVM",
    guarantee: "Checking every single transaction is affordable.",
    how: "The guard runs its checks inside each transaction, after your protocol’s own code. On Aurora those checks cost fractions of a cent, so nothing has to be sampled or skipped. The same guard runs on Base Sepolia.",
  },
  {
    layer: "3 · Respond",
    near: "Method-scoped NEAR keys",
    guarantee: "The monitor can only make your protocol safer.",
    how: "The monitor’s NEAR key is a function-call key limited to one method on the Kronos registry: tighten. NEAR itself rejects any other call from that key. A stolen key cannot loosen a limit or move funds.",
  },
  {
    layer: "3 · Respond",
    near: "NEAR Chain Signatures",
    guarantee: "One NEAR key protects every chain. We never hold an EVM key.",
    how: "Each protocol gets an EVM address controlled by NEAR’s MPC network. In an emergency the registry builds the tighten transaction itself, the MPC network signs it, and it is sent to the guard on Aurora and on Base. The guard reverts anything that is not tighter than before.",
  },
];

const ROADMAP = [
  ["Pause and cap changes across chains", "Recorded on the NEAR registry today. Not yet signed onto EVM chains: Chain Signatures covers outflow tightens only."],
  ["NEAR Intents", "Not used today. Planned for cross-chain settlement of queued withdrawals."],
  ["Proofs of attestations", "Attestations are signed today, not proven. Proving them is future work."],
  ["Mainnet", "Everything here runs on testnet: Aurora testnet, Base Sepolia and NEAR testnet."],
];

const CANT = ["Phishing: a user signing a malicious intent", "Stolen exchange or wallet keys", "Bugs in a chain’s own software", "Bugs in the invariants themselves"];

export default function WhyNear() {
  const Proof = ({ label, value, href }: { label: string; value: string; href: string }) => (
    <a href={href} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 transition-colors duration-k last:border-b-0 hover:bg-surface-2 md:px-5">
      <span className="min-w-0">
        <span className="block font-mono text-11 uppercase tracking-[0.06em] text-text-3">{label}</span>
        <span className="mt-1 block truncate font-mono text-13 text-text">{value}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-text-3 transition-colors duration-k group-hover:text-text" />
    </a>
  );
  return (
    <>
      <SiteNav />
      <main id="main" className="k-container pb-24 pt-12 md:pt-16">
        <PageHead
          eyebrow={<Eyebrow>Why NEAR</Eyebrow>}
          title="NEAR is what makes the safety guarantees possible."
          lede="AI in a trusted enclave writes the guard. Aurora enforces it cheaply. A NEAR key that can only tighten handles emergencies on every chain."
        />

        <ol className="mt-12 grid gap-px overflow-hidden rounded-panel border border-line-2 bg-line md:grid-cols-2">
          {PIECES.map((p) => (
            <li key={p.near} className="flex flex-col bg-surface p-5 md:p-7">
              <p className="flex flex-wrap items-center justify-between gap-2 font-mono text-11 uppercase tracking-[0.08em] text-text-3">
                <span>{p.layer}</span>
                <span className="text-text">{p.near}</span>
              </p>
              <h2 className="mt-5 text-22 font-medium text-text">{p.guarantee}</h2>
              <p className="mt-3 text-15 text-text-2">{p.how}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <section className="min-w-0 lg:col-span-7" aria-labelledby="proof">
            <h2 id="proof" className="text-22 font-medium text-text">
              Check it yourself
            </h2>
            <p className="mt-2 max-w-[38rem] text-15 text-text-2">These are public testnet records, not screenshots.</p>
            <div className="mt-5 overflow-hidden rounded-panel border border-line-2 bg-surface">
              <Proof label="Kronos registry contract · NEAR testnet" value={NEAR_REGISTRY} href={nearAccountUrl(NEAR_REGISTRY)} />
              <Proof label="MPC signer contract · NEAR testnet" value={NEAR_MPC_SIGNER} href={nearAccountUrl(NEAR_MPC_SIGNER)} />
              {SAMPLE_TIGHTEN_NEAR_TX ? <Proof label="Sample tighten · the NEAR transaction that asked for the signature" value={SAMPLE_TIGHTEN_NEAR_TX} href={nearTxUrl(SAMPLE_TIGHTEN_NEAR_TX)} /> : null}
              <Proof label="Sample tighten · sent on Aurora testnet by a Chain Signatures address" value={SAMPLE_TIGHTEN_EVM_TX} href={SAMPLE_TIGHTEN_EVM_URL} />
            </div>
            <p className="mt-3 text-13 text-text-3">The sample lowered an outflow threshold from 200,000 to 100,000. Its sender is an address no private key exists for outside NEAR’s MPC network.</p>
          </section>

          <div className="grid min-w-0 content-start gap-8 lg:col-span-5">
            <section aria-labelledby="roadmap">
              <h2 id="roadmap" className="text-22 font-medium text-text">
                Not built yet
              </h2>
              <dl className="mt-4 border-t border-line">
                {ROADMAP.map(([t, d]) => (
                  <div key={t} className="border-b border-line py-3.5">
                    <dt className="text-15 font-medium text-text">{t}</dt>
                    <dd className="mt-1 text-13 text-text-2">{d}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section aria-labelledby="cant">
              <h2 id="cant" className="text-22 font-medium text-text">
                What Kronos can’t stop
              </h2>
              <ul className="mt-4 grid gap-2.5 text-15 text-text-2">
                {CANT.map((c) => (
                  <li key={c} className="flex gap-3">
                    <Cross className="mt-1.5 size-3.5 shrink-0 text-text-3" />
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-13 text-text-3">Keep audits and fork tests in your release process.</p>
            </section>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-line pt-8">
          <ButtonLink href="/connect" size="lg">
            Protect a protocol
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/#how-it-works" variant="secondary" size="lg">
            See the three layers
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
