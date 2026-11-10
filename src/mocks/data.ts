/**
 * Static content for the mock API: a scripted analysis of the MiniLend sample (the backend's demo
 * lending protocol). Shapes mirror the backend DTOs in openapi.json plus the worker's payloads.
 */
import type { Entrypoint, IntentSchema, Invariant, Tier, TestReport } from "@/api/types";

export const BASE_SEPOLIA = 84532;
export const AURORA_TESTNET = 1313161555;
export const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const WETH = "0x4200000000000000000000000000000000000006";

type Ep = Omit<Entrypoint, "id"> & { key: string };
export const ENTRYPOINTS: Ep[] = [
  { key: "deposit", contract: "MiniLend", signature: "deposit(address,uint256)", selector: "0x47e7ef24", kind: "deposit", role: "user", notes: null },
  { key: "withdraw", contract: "MiniLend", signature: "withdraw(address,uint256)", selector: "0xf3fef3a3", kind: "withdraw", role: "user", notes: null },
  { key: "borrow", contract: "MiniLend", signature: "borrow(address,uint256)", selector: "0x4b8a3529", kind: "borrow", role: "user", notes: null },
  { key: "repay", contract: "MiniLend", signature: "repay(address,uint256)", selector: "0x22867d78", kind: "repay", role: "user", notes: null },
  { key: "liquidate", contract: "MiniLend", signature: "liquidate(address,address,uint256)", selector: "0x26c4e60d", kind: "liquidate", role: "user", notes: null },
  { key: "flashLoan", contract: "MiniLend", signature: "flashLoan(address,uint256,bytes)", selector: "0x5cffe9de", kind: "flashloan", role: "user", notes: null },
  { key: "pause", contract: "MiniLend", signature: "pause()", selector: "0x8456cb59", kind: "pause", role: "privileged", notes: "tighten-only" },
  { key: "setCap", contract: "MiniLend", signature: "setCap(address,uint256)", selector: "0x8f1e8c5e", kind: "setCap", role: "privileged", notes: null },
  { key: "setReserveFactor", contract: "MiniLendCore", signature: "setReserveFactor(uint256)", selector: "0x1a2b3c4d", kind: "setCap", role: "privileged", notes: null },
  { key: "setCollateralFactor", contract: "MiniLendCore", signature: "setCollateralFactor(address,uint256)", selector: "0x2d3e4f5a", kind: "setCap", role: "privileged", notes: null },
  { key: "listMarket", contract: "MiniLendCore", signature: "listMarket(address,address,uint256)", selector: "0x3e4f5a6b", kind: "listAsset", role: "privileged", notes: "new collateral starts on probation" },
  { key: "setOracle", contract: "MiniLendCore", signature: "setOracle(address,address)", selector: "0x4f5a6b7c", kind: "setOracle", role: "privileged", notes: null },
  { key: "setGuardian", contract: "MiniLendCore", signature: "setGuardian(address)", selector: "0x5a6b7c8d", kind: "upgrade", role: "privileged", notes: null },
  { key: "upgradeTo", contract: "MiniLend", signature: "upgradeTo(address)", selector: "0x3659cfe6", kind: "upgrade", role: "privileged", notes: null },
];

type Inv = Omit<Invariant, "id"> & { key: string };
export const INVARIANTS: Inv[] = [
  {
    key: "oracle",
    template: "oracle_sanity",
    title: "Oracle sanity against the attested 30m TWAP",
    plainText: "Any action that reads a price reverts if the spot price is more than 2% away from the attested 30-minute TWAP.",
    solidity: `function _postOracle(address asset) internal view {\n    uint256 spot = core.oraclePrice(asset);\n    uint256 twap = registry.twap30m(block.chainid, asset);\n    LendingInvariants.checkOracle(spot, twap, params.oracleDeviationBps);\n}`,
    params: { oracleDeviationBps: 200, twapWindowSeconds: 1800 },
    drafters: ["drafter-a"],
    evidence: { rationale: "Drafter A chose 2%, drafter B 3%. MiniLend's 90-day max honest deviation was 1.4%.", stops: "Oracle pump: spot moved 41% above the attested TWAP", disagreement: "oracleDeviationBps: A=200, B=300", round: 0, blockedBy: ["oracle pump replay"] },
    needsReview: true,
    status: "proposed",
  },
  {
    key: "cap",
    template: "collateral_cap",
    title: "Collateral cap per market",
    plainText: "Total collateral posted in a market can never exceed its cap; markets on probation are capped at 5% of the cap.",
    solidity: `function _postCap(address market) internal view {\n    LendingInvariants.checkCap(\n        core.totalCollateral(market),\n        core.cap(market),\n        probation.isOnProbation(market) ? params.probationCapBps : 10_000\n    );\n}`,
    params: { probationCapBps: 500, probationDays: 14 },
    drafters: ["drafter-b"],
    evidence: { rationale: "Only drafter B added the probation cap.", stops: "Fake collateral listed, then borrowed against immediately", disagreement: "probationCapBps present only in B", round: 0, blockedBy: ["fake collateral listing"] },
    needsReview: true,
    status: "proposed",
  },
  {
    key: "health",
    template: "account_health",
    title: "Account health after every action",
    plainText: "After borrow or withdraw, the account's health factor stays at or above 1.10.",
    solidity: `function _postHealth(address account) internal view {\n    LendingInvariants.checkHealth(core.healthFactor(account), params.minHealthBps);\n}`,
    params: { minHealthBps: 11000 },
    drafters: ["drafter-a", "drafter-b"],
    evidence: { rationale: "Both drafters agree.", stops: "Borrowing against thin collateral", disagreement: null, round: 0, blockedBy: ["oracle pump replay"] },
    needsReview: false,
    status: "proposed",
  },
  {
    key: "solvency",
    template: "solvency",
    title: "Aggregate solvency",
    plainText: "Cash plus outstanding borrows always covers total deposits minus reserves.",
    solidity: `function _postSolvency() internal view {\n    LendingInvariants.checkSolvency(core.cash(), core.totalBorrows(), core.totalDeposits(), core.reserves());\n}`,
    params: { toleranceWei: 1 },
    drafters: ["drafter-a", "drafter-b"],
    evidence: { rationale: "Both drafters agree.", stops: "Accounting bugs that mint unbacked deposits", disagreement: null, round: 0, blockedBy: ["rounding loop"] },
    needsReview: false,
    status: "proposed",
  },
  {
    key: "share",
    template: "share_price_delta",
    title: "Share price moves at most 0.5% per transaction",
    plainText: "The deposit-share exchange rate cannot move more than 0.5% inside one transaction.",
    solidity: `function _postSharePrice(uint256 before) internal view {\n    LendingInvariants.checkSharePrice(before, core.exchangeRate(), params.maxShareDeltaBps);\n}`,
    params: { maxShareDeltaBps: 50 },
    drafters: ["drafter-a", "drafter-b"],
    evidence: { rationale: "Both drafters agree.", stops: "Donation moved the exchange rate in one transaction", disagreement: null, round: 0, blockedBy: ["donation share inflation"] },
    needsReview: false,
    status: "proposed",
  },
  {
    key: "flash",
    template: "flashloan_repaid",
    title: "Flash loan repaid in the same transaction",
    plainText: "A flash loan's principal plus fee is back in the pool before the transaction ends.",
    solidity: `function _postFlash(uint256 cashBefore, uint256 fee) internal view {\n    require(core.cash() >= cashBefore + fee, "flash: not repaid");\n}`,
    params: { feeBps: 9 },
    drafters: ["drafter-a", "drafter-b"],
    evidence: { rationale: "Both drafters agree.", stops: "Unrepaid flash loans", disagreement: null, round: 0 },
    needsReview: false,
    status: "proposed",
  },
  {
    key: "liq",
    template: "liquidation_bonus",
    title: "Liquidation bonus bounded",
    plainText: "A liquidator never receives more than 8% bonus over the repaid debt's value.",
    solidity: `function _postLiquidation(uint256 repaidValue, uint256 seizedValue) internal view {\n    require(seizedValue * 10_000 <= repaidValue * (10_000 + params.maxLiqBonusBps), "liq: bonus");\n}`,
    params: { maxLiqBonusBps: 800 },
    drafters: ["drafter-a", "drafter-b"],
    evidence: { rationale: "Both drafters agree.", stops: "Over-seizing collateral during liquidation", disagreement: null, round: 0 },
    needsReview: false,
    status: "proposed",
  },
  {
    key: "reserves",
    template: "reserve_accounting",
    title: "Reserves never decrease outside the timelock",
    plainText: "Protocol reserves only go down through a Tier 1 timelocked withdrawal.",
    solidity: `function _postReserves(uint256 before) internal view {\n    require(core.reserves() >= before || msg.sender == address(timelock), "reserves");\n}`,
    params: {},
    drafters: ["drafter-a", "drafter-b"],
    evidence: { rationale: "Both drafters agree.", stops: "Admin draining reserves", disagreement: null, round: 0 },
    needsReview: false,
    status: "proposed",
  },
  {
    key: "index",
    template: "debt_index_monotonic",
    title: "Borrow index only grows",
    plainText: "The borrow index never decreases, so debt cannot be erased by accrual tricks.",
    solidity: `function _postIndex(uint256 before) internal view {\n    require(core.borrowIndex() >= before, "index");\n}`,
    params: {},
    drafters: ["drafter-a", "drafter-b"],
    evidence: { rationale: "Both drafters agree.", stops: "Rounding loops that shrink debt", disagreement: null, round: 0, blockedBy: ["rounding loop"] },
    needsReview: false,
    status: "proposed",
  },
];

export function intentFor(ep: Ep, chainId: number, guard = "0x0000000000000000000000000000000000000000"): Omit<IntentSchema, "id" | "entrypointId"> {
  const primaryType = `${ep.key[0]!.toUpperCase()}${ep.key.slice(1)}Intent`;
  const maxLtv = ep.kind === "borrow" ? 7000 : 0;
  const plain: Record<string, string> = {
    deposit: "Deposit exactly {amount} {asset} into your own position.",
    withdraw: "Withdraw up to {amount} {asset} to you; your health factor stays at or above {minHealth}.",
    borrow: "Borrow {amount} {asset} to you; your LTV stays at or below {maxLtv} and health at or above {minHealth}.",
    repay: "Repay up to {amount} {asset} of your own debt.",
    liquidate: "Repay {amount} of {account}'s debt and receive their {asset} collateral at the liquidation bonus.",
    flashloan: "Flash-borrow {amount} {asset}; it must be repaid in the same transaction.",
  };
  return {
    eip712: {
      domain: { name: "Kronos", version: "1", chainId, verifyingContract: guard },
      primaryType,
      types: {
        [primaryType]: [
          { name: "account", type: "address" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "maxLtvBps", type: "uint16" },
          { name: "minHealthBps", type: "uint16" },
          { name: "recipient", type: "address" },
          { name: "deadline", type: "uint64" },
          { name: "nonce", type: "uint256" },
        ],
      },
    },
    bounds: {
      amount: "user-chosen; the action can never exceed it",
      maxLtvBps: maxLtv,
      minHealthBps: ep.kind === "borrow" || ep.kind === "withdraw" ? 11000 : 0,
      recipient: "signer unless named explicitly",
      account: ep.kind === "liquidate" ? "the borrower being liquidated" : "must equal the signer",
      deadlineSeconds: 1800,
      nonce: "unordered, single use",
    },
    plainText: `${plain[ep.kind] ?? "Perform this action."} Valid for 30 minutes, single use.`,
    status: "proposed",
  };
}

export const TIER_PLAN: Record<string, { tier: number; source: Tier["source"]; rationale: string }> = {
  pause: { tier: 0, source: "rule", rationale: "Tightening is always instant: guardians can pause." },
  setCap: { tier: 1, source: "agent", rationale: "Routine parameter; lowering is instant, raising waits 48h." },
  setReserveFactor: { tier: 1, source: "agent", rationale: "Routine parameter change." },
  setCollateralFactor: { tier: 2, source: "agent", rationale: "Raising a collateral factor adds risk." },
  listMarket: { tier: 2, source: "agent", rationale: "New collateral is risk-adding; starts on probation." },
  setOracle: { tier: 2, source: "rule", rationale: "Hard rule: an oracle change is always at least Tier 2." },
  setGuardian: { tier: 3, source: "rule", rationale: "Hard rule: signer and guard changes are Tier 3 with co-sign." },
  upgradeTo: { tier: 3, source: "rule", rationale: "Hard rule: upgrades are always Tier 3 with co-sign." },
};

export const TEST_REPORT: Omit<NonNullable<TestReport>, "id"> = {
  normalTxCount: 212,
  normalPass: 212,
  attacksTotal: 6,
  attacksBlocked: 6,
  gas: {
    borrow: { plain: 98412, guarded: 121987, overhead: 23575 },
    withdraw: { plain: 71220, guarded: 90114, overhead: 18894 },
    deposit: { plain: 64301, guarded: 78810, overhead: 14509 },
    repay: { plain: 52877, guarded: 66012, overhead: 13135 },
    liquidate: { plain: 143900, guarded: 171250, overhead: 27350 },
    flashLoan: { plain: 88120, guarded: 104410, overhead: 16290 },
  },
  details: {
    attacks: [
      { name: "oracle pump (spot +41% vs TWAP)", blocked: true, at: "checkOracle" },
      { name: "donation share inflation", blocked: true, at: "checkSharePrice" },
      { name: "rounding loop", blocked: true, at: "checkSolvency" },
      { name: "reentrancy via callback token", blocked: true, at: "nonReentrant + checkHealth" },
      { name: "fake collateral listing", blocked: true, at: "probation + Tier 2 timelock" },
      { name: "split withdrawals (25 × under per-tx cap)", blocked: true, at: "outflow window (queued)" },
    ],
  },
};

export const THRESHOLDS = {
  source: "p99.9 of 90 days of net outflow",
  assets: [
    { asset: USDC, symbol: "USDC", threshold: "250000", p999: "212400", staleLimit: "50000" },
    { asset: WETH, symbol: "WETH", threshold: "120", p999: "96", staleLimit: "20" },
  ],
};

export const CONFIG_HASH = "0x8c21f0e9a4d7b36c51e2a09f8d4c7b1e3a6f9d02c4b8e7a1f3d5c9b0e2a4f6d8";

export function packageFiles(name: string) {
  const integration = `# Integrating Kronos into ${name}

Package v1.0.0 · config hash \`${CONFIG_HASH}\`

Kronos is a security layer: every user and admin action passes the same guard in the same transaction.

## What's inside
- \`src/kronos/lib/\` — the Kronos guard library: KronosGuard, LendingInvariants, OutflowBreaker, GuardTimelock, AttestationRegistry.
- \`src/kronos/GuardConfig.${name}.sol\` — generated: wires your getters into the invariant templates.
- \`src/kronos/Guarded${name}.sol\` — generated: your entry points taking a signed intent with \`guarded(...)\`.
- \`test/kronos/\` — normal-traffic replays and the attack library.
- \`script/DeployKronos.s.sol\` — deploys the timelock, registry and guarded protocol.
- \`kronos.config.json\` — every approved decision.

## Steps
1. \`forge test --match-path 'test/kronos/*'\` — everything must pass.
2. Deploy: \`forge script script/DeployKronos.s.sol --rpc-url <rpc> --broadcast\`
3. Add your initial listings with \`timelock.setupCall(...)\` before \`finalizeSetup\` (already in the script).
4. In Kronos, register the deployment (guard + timelock addresses). Kronos verifies the config hash, that every entry point reverts without a valid intent, and that the timelock owns every privileged role.
5. Frontend: use \`@kronos/sdk\` (see \`sdk/kronos-example.ts\`).

## What Kronos can't stop
Users signing a malicious intent (phishing), stolen exchange keys, bugs in the chain itself, or bugs in these invariants.
`;
  const guarded = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KronosGuard} from "./lib/KronosGuard.sol";
import {GuardConfig${name}} from "./GuardConfig.${name}.sol";
import {${name}} from "../${name}.sol";

contract Guarded${name} is ${name}, KronosGuard, GuardConfig${name} {
    function borrow(Intent calldata intent, bytes calldata sig)
        external
        guarded(Kind.Borrow, intent, sig)
    {
        _borrow(intent.account, intent.asset, intent.amount);
    }

    function withdraw(Intent calldata intent, bytes calldata sig)
        external
        guarded(Kind.Withdraw, intent, sig)
    {
        _withdraw(intent.account, intent.asset, intent.amount);
    }

    function setOracle(address asset, address oracle) external onlyTimelock {
        _setOracle(asset, oracle);
    }
}
`;
  const config = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LendingInvariants} from "./lib/LendingInvariants.sol";

/// Generated by Kronos. Config hash ${CONFIG_HASH.slice(0, 18)}…
abstract contract GuardConfig${name} {
    uint16 internal constant ORACLE_DEVIATION_BPS = 200;
    uint32 internal constant TWAP_WINDOW = 30 minutes;
    uint16 internal constant MIN_HEALTH_BPS = 11_000;
    uint16 internal constant MAX_SHARE_DELTA_BPS = 50;
    uint16 internal constant PROBATION_CAP_BPS = 500;

    function _postChecks(address account, address asset) internal view {
        LendingInvariants.checkHealth(_healthFactor(account), MIN_HEALTH_BPS);
        LendingInvariants.checkOracle(_spot(asset), _twap(asset), ORACLE_DEVIATION_BPS);
        LendingInvariants.checkSolvency(_cash(), _borrows(), _deposits(), _reserves());
    }
}
`;
  const sdk = `import { Kronos } from "@kronos/sdk";

const kronos = new Kronos({ chainId: 84532, guard: GUARD_ADDRESS });
const intent = await kronos.borrow({ asset: USDC, amount, maxLTV: 0.7, minHealth: 1.1 });
await kronos.submit(intent, walletClient);
`;
  const deploy = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";

/// env: RPC_URL, DEPLOYER_KEY, GUARDIAN, COSIGNER
contract DeployKronos is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_KEY"));
        // GuardTimelock, AttestationRegistry, Guarded${name}; setupTiers; finalizeSetup
        vm.stopBroadcast();
    }
}
`;
  return [
    { path: `src/kronos/Guarded${name}.sol`, content: guarded },
    { path: `src/kronos/GuardConfig.${name}.sol`, content: config },
    { path: "script/DeployKronos.s.sol", content: deploy },
    { path: "test/kronos/AttackLibrary.t.sol", content: "// 6 attack replays: oracle pump, share inflation, rounding loop, reentrancy, fake collateral, split drain\n" },
    { path: "test/kronos/NormalTraffic.t.sol", content: "// 12 normal-traffic flows replayed against the guarded protocol\n" },
    { path: "kronos.config.json", content: JSON.stringify({ version: "1.0.0", configHash: CONFIG_HASH, oracleDeviationBps: 200, minHealthBps: 11000 }, null, 2) + "\n" },
    { path: "sdk/kronos-example.ts", content: sdk },
    { path: "INTEGRATION.md", content: integration },
  ];
}
