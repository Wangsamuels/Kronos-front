"use client";
import { motion } from "framer-motion";
import { ATTACK_TESTS_URL } from "@/lib/links";

/** Only rows the backend's Foundry attack library replays (contracts/test). */
const ROWS = [
  { pattern: "Oracle pump", vector: "Spot price moved 41% above attested TWAP", loss: "modeled · thin-collateral oracle pumps, 2026", result: "Blocked at checkOracle", tone: "pass" },
  { pattern: "Share inflation", vector: "Donation moved exchange rate in one transaction", loss: "modeled · rounding / donation", result: "Blocked at checkSharePrice", tone: "pass" },
  { pattern: "Fake collateral listing", vector: "New market listed, then borrowed against immediately", loss: "modeled · fake-collateral listings", result: "Blocked at probation + Tier 2 timelock", tone: "pass" },
  { pattern: "Timelock bypass", vector: "Governance tried to skip delay on a risk-adding change", loss: "modeled · admin oracle swap", result: "Blocked at guard-owned timelock", tone: "pass" },
  { pattern: "Split withdrawals", vector: "25 same-sized outflows under a per-tx cap", loss: "modeled · rolling window", result: "Queued at outflow window", tone: "queue" },
  { pattern: "Intent tampering", vector: "Calldata amount differs from the signed EIP-712 intent", loss: "modeled · signature replay", result: "Blocked at intent pre-check", tone: "pass" },
] as const;

export function ReplayStrip() {
  return (
    <div>
      <div role="table" aria-label="Replayed attacks" className="hidden md:block">
        <div role="row" className="grid grid-cols-12 gap-4 border-b border-line py-3">
          {["Pattern", "Vector", "Original loss", "Result"].map((h, i) => (
            <span role="columnheader" key={h} className={["k-label col-span-2", "k-label col-span-4", "k-label col-span-3", "k-label col-span-3"][i]}>
              {h}
            </span>
          ))}
        </div>
        {ROWS.map((r, i) => (
          <motion.div
            role="row"
            key={r.pattern}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.06 }}
            className="grid grid-cols-12 items-center gap-4 border-b border-line py-3.5 text-15"
          >
            <span role="cell" className="col-span-2 text-text">{r.pattern}</span>
            <span role="cell" className="col-span-4 text-text-2">{r.vector}</span>
            <span role="cell" className="col-span-3 font-mono text-13 text-text">{r.loss}</span>
            <a role="cell" href={ATTACK_TESTS_URL} className={`col-span-3 font-mono text-13 hover:underline ${r.tone === "pass" ? "text-pass" : "text-queue"}`}>
              {r.result}
            </a>
          </motion.div>
        ))}
      </div>
      <ul className="grid gap-2 md:hidden">
        {ROWS.map((r) => (
          <li key={r.pattern} className="k-panel p-4">
            <p className="text-15 text-text">{r.pattern}</p>
            <p className="mt-1 text-13 text-text-2">{r.vector}</p>
            <p className="mt-2 font-mono text-11 text-text-3">{r.loss}</p>
            <a href={ATTACK_TESTS_URL} className={`mt-2 block font-mono text-13 ${r.tone === "pass" ? "text-pass" : "text-queue"}`}>
              {r.result}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
