"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

const STEPS = [
  { n: "01", title: "Link", body: "Paste the GitHub repo. The code is the source of truth; your website only adds hints, like deployed addresses." },
  { n: "02", title: "Analyze", body: "Agents map every entry point and draft the invariants. A red team attacks the draft on a fork. The compiler and the tests decide what holds." },
  { n: "03", title: "Review", body: "Your team approves every rule, bound and admin tier. Anything the two drafters disagreed on is pinned to the top." },
  { n: "04", title: "Merge", body: "One pull request adds the guard, the modifiers, timelock routing, the attack tests and a deploy script." },
];
const DWELL = 6000;

export function HowItWorks() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Steps advance on their own until the reader takes over.
  const running = auto && visible && !reduce;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((x) => (x + 1) % STEPS.length), DWELL);
    return () => clearTimeout(t);
  }, [running, i]);

  const pick = (j: number) => {
    setAuto(false);
    setI(j);
  };

  return (
    <div ref={ref}>
      <div className="grid grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="How it works">
        {STEPS.map((s, j) => {
          const on = i === j;
          return (
            <button
              key={s.n}
              role="tab"
              id={`hiw-tab-${j}`}
              aria-selected={on}
              aria-controls="hiw-panel"
              onClick={() => pick(j)}
              className={cn("group relative border-t pb-5 pr-4 pt-4 text-left transition-colors duration-k", on ? "border-text" : "border-line-2 hover:border-text-3")}
            >
              {/* dwell timer: the active step's rule fills while it is on screen */}
              {on && running ? <span key={i} aria-hidden className="absolute -top-px left-0 h-px w-full origin-left bg-pass" style={{ animation: `k-fill ${DWELL}ms linear both` }} /> : null}
              <span className={cn("font-mono text-11 tracking-[0.06em]", on ? "text-text" : "text-text-3")}>{s.n}</span>
              <span className={cn("mt-2 block text-22 font-medium transition-colors duration-k", on ? "text-text" : "text-text-3 group-hover:text-text-2")}>{s.title}</span>
            </button>
          );
        })}
      </div>

      <div id="hiw-panel" role="tabpanel" aria-labelledby={`hiw-tab-${i}`} className="mt-2 grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4 lg:pt-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="min-h-[6.5rem] text-lede text-text-2 lg:min-h-0">
              {STEPS[i]!.body}
            </motion.p>
          </AnimatePresence>
          <div className="mt-6 hidden items-center gap-2 lg:flex">
            <button onClick={() => pick((i + STEPS.length - 1) % STEPS.length)} aria-label="Previous step" className="grid size-10 place-items-center rounded-ctl border border-line-2 text-text-2 transition-colors duration-k hover:border-text-3 hover:text-text">
              <ArrowRight className="rotate-180" />
            </button>
            <button onClick={() => pick((i + 1) % STEPS.length)} aria-label="Next step" className="grid size-10 place-items-center rounded-ctl border border-line-2 text-text-2 transition-colors duration-k hover:border-text-3 hover:text-text">
              <ArrowRight />
            </button>
          </div>
        </div>
        <div className="min-h-[320px] overflow-hidden rounded-panel border border-line-2 bg-surface lg:col-span-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="h-full">
              {i === 0 && <ArtifactInput />}
              {i === 1 && <ArtifactLog />}
              {i === 2 && <ArtifactInvariant />}
              {i === 3 && <ArtifactDiff />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-line px-5 font-mono text-11 uppercase tracking-[0.06em] text-text-3">
      <span aria-hidden className="flex gap-1.5">
        <span className="block size-2 rounded-full bg-line-2" />
        <span className="block size-2 rounded-full bg-line-2" />
        <span className="block size-2 rounded-full bg-line-2" />
      </span>
      <span className="truncate">{children}</span>
    </div>
  );
}

function ArtifactInput() {
  return (
    <div>
      <Head>/connect</Head>
      <div className="grid gap-2 p-5 font-mono text-13 sm:p-6">
        <div className="rounded-ctl border border-line bg-surface-2 px-3 py-3"><span className="k-label mr-4">website</span>https://minilend.xyz</div>
        <div className="rounded-ctl border border-line bg-surface-2 px-3 py-3"><span className="k-label mr-4">repo</span>github.com/minilend/protocol</div>
        <div className="rounded-ctl border border-line bg-surface-2 px-3 py-3"><span className="k-label mr-4">chain</span>Base Sepolia</div>
        <p className="mt-3 flex items-start gap-2 text-text-2"><span aria-hidden className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-pass" />detected MiniLend.sol, MiniLendCore.sol · 2 addresses from deploy files</p>
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
      <ul className="px-5 py-3 font-mono text-13">
        {lines.map(([s, m], k) => (
          <li key={k} className="flex gap-4 border-b border-line/60 py-2.5 last:border-b-0">
            <span className="w-[5.5rem] shrink-0 text-11 uppercase leading-[1.65] tracking-[0.06em] text-text-3">{s}</span>
            <span className={m!.startsWith("BLOCKED") ? "text-block" : m!.includes("flagged") ? "text-queue" : m!.includes("0 false positives") ? "text-pass" : "text-text-2"}>{m}</span>
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
      <div className="p-5 sm:p-6">
        <p className="text-22 font-medium text-text">Oracle sanity against the attested 30m TWAP</p>
        <p className="mt-2 text-15 text-text-2">Any action that reads a price reverts if spot is more than 2% from the attested 30-minute TWAP.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-13">
          <span className="text-text-3">oracleDeviationBps</span>
          <span className="rounded-ctl border border-line bg-surface-2 px-3 py-1.5">− 200 +</span>
          <span className="text-queue">drafter A 200 · drafter B 300</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4 font-mono text-13">
          <span className="text-text-3">evidence</span>
          <span className="k-tag k-tag-block">blocked</span>
          <span className="text-text-2">oracle pump replay</span>
          <span className="ml-auto flex gap-2">
            <span className="rounded-ctl border border-line-2 px-3 py-1.5 text-text-2">Reject</span>
            <span className="rounded-ctl bg-text px-3 py-1.5 text-bg">Approve</span>
          </span>
        </div>
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
      <pre className="overflow-x-auto py-4 font-mono text-13 leading-7">
        {diff.map(([s, l], k) => (
          <div key={k} className={s === "+" ? "bg-pass/[0.07] px-5 text-pass" : s === "-" ? "bg-block/[0.07] px-5 text-block" : "px-5 text-text-2"}>
            <span className="mr-3 inline-block w-3 select-none opacity-70">{s}</span>
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}
