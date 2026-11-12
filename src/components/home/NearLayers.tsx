import Link from "next/link";
import { ArrowRight, Check, Cross } from "@/components/ui/Icons";

const LAYERS = [
  {
    n: "1",
    verb: "Analyze",
    near: "NEAR AI Cloud",
    title: "Two AI models draft your rules inside a hardware enclave.",
    points: ["Two independent models write the invariants", "Where they disagree, the decision comes to you", "You approve every rule before anything ships"],
  },
  {
    n: "2",
    verb: "Enforce",
    near: "Aurora, NEAR’s EVM",
    title: "The guard checks every transaction on-chain, for fractions of a cent.",
    points: ["Guard checks run on Aurora testnet, and on Base Sepolia", "Every action is checked against your invariants", "Risky admin changes wait 2 to 14 days in public"],
  },
  {
    n: "3",
    verb: "Respond",
    near: "NEAR Chain Signatures",
    title: "One NEAR key handles emergencies on every chain. It can only tighten.",
    points: ["The key is limited on NEAR to one method: tighten", "The registry builds the EVM transaction itself", "NEAR’s MPC network signs it. We never hold an EVM key"],
  },
];

/** The shape repeated across the site: Analyze → Enforce → Respond, with the NEAR piece that delivers each. */
export function NearLayers() {
  return (
    <div>
      <ol className="grid gap-px overflow-hidden rounded-panel border border-line-2 bg-line lg:grid-cols-3">
        {LAYERS.map((l, i) => (
          <li key={l.n} className="relative flex flex-col bg-surface p-5 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-3 font-mono text-11 uppercase tracking-[0.08em] text-text-2">
                <span className="grid size-6 place-items-center rounded-full border border-line-2 text-text">{l.n}</span>
                {l.verb}
              </p>
              {i < LAYERS.length - 1 ? <ArrowRight className="hidden text-text-3 lg:block" /> : null}
            </div>
            <h3 className="mt-6 text-22 font-medium text-text">{l.title}</h3>
            <ul className="mt-5 grid gap-2.5 text-15 text-text-2">
              {l.points.map((p) => (
                <li key={p} className="flex gap-3">
                  <Check className="mt-1 size-3.5 shrink-0 text-pass" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-7 font-mono text-11 uppercase tracking-[0.06em] text-text-3">
              runs on <span className="text-text">{l.near}</span>
            </p>
          </li>
        ))}
      </ol>

      {/* The one claim to remember: the agent cannot make things less safe. */}
      <div className="mt-4 grid gap-px overflow-hidden rounded-panel border border-line-2 bg-line lg:grid-cols-12">
        <div className="bg-surface p-6 md:p-8 lg:col-span-7">
          <p className="k-label">The only-tightens rule</p>
          <p className="mt-4 max-w-[22ch] text-title font-medium text-text">Our monitor can only make your protocol safer.</p>
          <p className="mt-4 max-w-[36rem] text-lede text-text-2">
            Its NEAR key is limited to one action: tighten. Three separate layers refuse anything else, so a stolen key or a confused agent still cannot raise a limit or move funds.
          </p>
          <ol className="mt-6 grid gap-3 text-15 text-text-2">
            {[
              ["NEAR", "rejects any method other than tighten for this key."],
              ["The registry", "only signs transactions it built itself: an outflow tighten, to your registered guard."],
              ["The guard", "reverts anything that is not tighter than before."],
            ].map(([who, what], k) => (
              <li key={who} className="grid grid-cols-[1.75rem_1fr] gap-2">
                <span className="font-mono text-11 leading-6 text-text-3">0{k + 1}</span>
                <span>
                  <span className="text-text">{who}</span> {what}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col justify-between gap-6 bg-bg p-6 md:p-8 lg:col-span-5">
          <div className="grid gap-3 font-mono text-13">
            <p className="k-label">Same key, two requests</p>
            <div className="rounded-ctl border border-line-2 bg-surface p-4">
              <p className="flex items-center justify-between gap-3">
                <span className="text-text">tighten(outflow)</span>
                <span className="k-tag k-tag-pass">
                  <Check className="size-3" />
                  signed
                </span>
              </p>
              <p className="mt-2 text-text-3">200,000 → 100,000 · signed by NEAR MPC · sent to the guard on Aurora testnet</p>
            </div>
            <div className="rounded-ctl border border-line-2 bg-surface p-4">
              <p className="flex items-center justify-between gap-3">
                <span className="text-text-2">loosen(outflow)</span>
                <span className="k-tag k-tag-block">
                  <Cross className="size-3" />
                  refused
                </span>
              </p>
              <p className="mt-2 text-text-3">100,000 → 200,000 · NotTighter</p>
            </div>
          </div>
          <p className="text-13 text-text-3">
            Chain Signatures covers outflow tightens today, on Aurora testnet and Base Sepolia.{" "}
            <Link href="/why-near" className="k-link whitespace-nowrap">
              Why NEAR
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
