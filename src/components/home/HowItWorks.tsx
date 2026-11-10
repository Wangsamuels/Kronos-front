"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/cn";

const STEPS = [
  { n: "01", title: "Link", body: "Paste the repo and, optionally, the website. Website addresses are hints, never the source of truth." },
  { n: "02", title: "Analyze", body: "Agents map entry points, draft intents and invariants. A red team attacks them; the fork decides." },
  { n: "03", title: "Review", body: "Your team approves each invariant, intent bound and admin tier. Disagreements are pinned on top." },
  { n: "04", title: "Merge", body: "One PR adds the guard, modifiers, timelock routing, attack tests and a deploy script." },
];

export function HowItWorks() {
  const [i, setI] = useState(0);
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <ol className="grid gap-px overflow-hidden rounded-panel border border-line bg-line lg:col-span-5" role="tablist" aria-label="How it works">
        {STEPS.map((s, j) => (
          <li key={s.n} className="bg-bg">
            <button
              role="tab"
              aria-selected={i === j}
              onClick={() => setI(j)}
              onMouseEnter={() => setI(j)}
              className={cn("flex w-full gap-4 p-5 text-left transition-colors duration-k", i === j ? "bg-surface" : "hover:bg-surface/60")}
            >
              <span className={cn("font-mono text-13", i === j ? "text-text" : "text-text-3")}>{s.n}</span>
              <span>
                <span className="block text-17 font-medium text-text">{s.title}</span>
                <span className="mt-1 block text-13 text-text-2">{s.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="k-panel min-h-[300px] overflow-hidden lg:col-span-7" role="tabpanel" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="h-full">
            {i === 0 && <ArtifactInput />}
            {i === 1 && <ArtifactLog />}
            {i === 2 && <ArtifactInvariant />}
            {i === 3 && <ArtifactDiff />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <div className="k-label border-b border-line px-5 py-3">{children}</div>;
}

function ArtifactInput() {
  return (
    <div>
      <Head>/connect</Head>
      <div className="grid gap-2 p-5 font-mono text-13">
        <div className="rounded-ctl border border-line bg-surface-2 px-3 py-3"><span className="k-label mr-4">website</span>https://minilend.xyz</div>
        <div className="rounded-ctl border border-line bg-surface-2 px-3 py-3"><span className="k-label mr-4">repo</span>github.com/minilend/protocol</div>
        <div className="rounded-ctl border border-line bg-surface-2 px-3 py-3"><span className="k-label mr-4">chain</span>Base Sepolia</div>
        <p className="mt-2 text-text-3">detected: MiniLend.sol, MiniLendCore.sol · 2 addresses from deploy files</p>
      </div>
    </div>
  );
}

function ArtifactLog() {
  const lines = [
    ["ingest", "Classified as lending (97%): borrow/repay/liquidate entry points"],
    ["map", "User borrow: borrow(address,uint256)"],
    ["map", "Privileged setOracle: setOracle(address,address)"],
    ["invariants", "Oracle sanity against the attested 30m TWAP — drafters disagree, flagged"],
    ["verify", "BLOCKED: oracle pump (spot +41% vs TWAP) at checkOracle"],
    ["verify", "Fork replay: 200/200 pass, 0 false positives"],
  ];
  return (
    <div>
      <Head>live log · /p/minilend/analysis</Head>
      <ul className="p-5 font-mono text-13">
        {lines.map(([s, m], k) => (
          <li key={k} className="flex gap-4 py-1">
            <span className="w-20 shrink-0 uppercase text-text-3">{s}</span>
            <span className={m!.startsWith("BLOCKED") ? "text-pass" : m!.includes("flagged") ? "text-queue" : "text-text-2"}>{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArtifactInvariant() {
  return (
    <div>
      <Head>invariant · oracle_sanity · flagged</Head>
      <div className="p-5">
        <p className="text-17 text-text">Oracle sanity against the attested 30m TWAP</p>
        <p className="mt-2 text-15 text-text-2">Any action that reads a price reverts if spot is more than 2% from the attested 30-minute TWAP.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-13">
          <span className="text-text-3">oracleDeviationBps</span>
          <span className="rounded-ctl border border-line bg-surface-2 px-3 py-1.5">− 200 +</span>
          <span className="text-queue">drafter A 200 · drafter B 300</span>
        </div>
        <p className="mt-4 font-mono text-13 text-pass">evidence · Blocked: oracle pump replay</p>
      </div>
    </div>
  );
}

function ArtifactDiff() {
  const diff = [
    ["+", "import {KronosGuard} from \"./kronos/lib/KronosGuard.sol\";"],
    [" ", "function borrow(address asset, uint256 amount)"],
    ["-", "    external nonReentrant"],
    ["+", "    external nonReentrant guarded(Kind.Borrow, intent, sig)"],
    [" ", "{"],
    ["+", "function setOracle(address a, address o) external onlyTimelock {"],
  ];
  return (
    <div>
      <Head>PR #42 · Integrate Kronos guard (v1.0.0) · 8 files</Head>
      <pre className="overflow-x-auto p-5 font-mono text-13">
        {diff.map(([s, l], k) => (
          <div key={k} className={s === "+" ? "text-pass" : s === "-" ? "text-block" : "text-text-2"}>
            {s} {l}
          </div>
        ))}
      </pre>
    </div>
  );
}
