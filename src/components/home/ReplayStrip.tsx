"use client";
import { motion, useReducedMotion } from "framer-motion";
import { ATTACK_TESTS_URL } from "@/lib/links";
import { ArrowUpRight } from "@/components/ui/Icons";

/** Only rows the backend's Foundry attack library replays (contracts/test). */
const ROWS = [
  { pattern: "Oracle pump", vector: "Spot price pushed 41% above the attested TWAP, then borrowed against.", source: "thin-collateral oracle pumps", verdict: "blocked", at: "checkOracle" },
  { pattern: "Share inflation", vector: "A donation moves the exchange rate inside a single transaction.", source: "rounding / donation attacks", verdict: "blocked", at: "checkSharePrice" },
  { pattern: "Fake collateral listing", vector: "A new market is listed and borrowed against immediately.", source: "fake-collateral listings", verdict: "blocked", at: "probation + Tier 2 timelock" },
  { pattern: "Timelock bypass", vector: "Governance tries to skip the delay on a risk-adding change.", source: "admin oracle swaps", verdict: "blocked", at: "guard-owned timelock" },
  { pattern: "Split withdrawals", vector: "25 same-sized outflows, each one under the per-transaction cap.", source: "rolling-window drains", verdict: "queued", at: "outflow window" },
  { pattern: "Intent tampering", vector: "Calldata amount differs from the signed EIP-712 intent.", source: "signature replay", verdict: "blocked", at: "intent pre-check" },
] as const;

/** The attack ledger: one row per replayed pattern, the verdict set apart on the right like a receipt. */
export function ReplayStrip() {
  const reduce = useReducedMotion();
  return (
    <ol className="border-b border-line" aria-label="Replayed attacks">
      {ROWS.map((r, i) => (
        <motion.li
          key={r.pattern}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
          className="group grid gap-x-6 gap-y-3 border-t border-line py-5 transition-colors duration-k hover:bg-surface/60 lg:grid-cols-12 lg:items-center lg:px-3 lg:py-6"
        >
          <span className="hidden font-mono text-13 text-text-3 lg:col-span-1 lg:block">{String(i + 1).padStart(2, "0")}</span>
          <div className="lg:col-span-5">
            <p className="text-[19px] font-medium leading-snug tracking-[-0.01em] text-text">{r.pattern}</p>
            <p className="mt-1 max-w-[30rem] text-15 text-text-2">{r.vector}</p>
          </div>
          <p className="font-mono text-11 uppercase tracking-[0.06em] text-text-3 lg:col-span-2">
            modeled on
            <span className="block normal-case tracking-normal text-text-2 lg:mt-1 lg:text-13">{r.source}</span>
          </p>
          <a
            href={ATTACK_TESTS_URL}
            className="flex items-center gap-3 lg:col-span-4 lg:justify-end"
            aria-label={`${r.pattern}: ${r.verdict} at ${r.at}. View the test.`}
          >
            <span className={r.verdict === "blocked" ? "k-tag k-tag-block" : "k-tag k-tag-queue"}>{r.verdict}</span>
            <span className="font-mono text-13 text-text-2 transition-colors duration-k group-hover:text-text lg:whitespace-nowrap">{r.at}</span>
            <ArrowUpRight className="hidden size-3.5 shrink-0 text-text-3 transition-colors duration-k group-hover:text-text lg:block" />
          </a>
        </motion.li>
      ))}
    </ol>
  );
}
