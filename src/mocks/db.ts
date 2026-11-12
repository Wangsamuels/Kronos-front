/**
 * In-browser state for the mock API, persisted to localStorage so the mocked flow survives reloads.
 * The analysis run is a timed script: each event has an `at` timestamp and is revealed (and its
 * side effects applied) once that time has passed. Approving appends the packaging script with ids
 * that continue after the analysis events, exactly like the backend's run_events table.
 */
import type { AdminAction, Deployment, IntentSchema, Invariant, Package, Protocol, ProtocolEvent, Run, RunEvent, Settings, Tier, VerifyCheck } from "@/api/types";
import { CONFIG_HASH, ENTRYPOINTS, INVARIANTS, TEST_REPORT, THRESHOLDS, TIER_PLAN, USDC, WETH, AURORA_TESTNET, BASE_SEPOLIA, intentFor, packageFiles } from "./data";

type Effect =
  | { kind: "run"; status?: Run["status"]; stage?: string; finished?: boolean }
  | { kind: "protocol"; status: Protocol["status"]; type?: string }
  | { kind: "package" };

interface Scripted {
  ev: RunEvent;
  at: number;
  effects?: Effect[];
}

export interface MockRun extends Run {
  script: Scripted[];
  nextId: number;
}

export interface MockState {
  version: number;
  users: Record<string, { id: string; githubLogin: string | null; walletAddress: string | null; nearAccount: string | null; githubAppInstalled: boolean; createdAt: string }>;
  protocols: Protocol[];
  runs: Record<string, MockRun>;
  entrypoints: Record<string, (ReturnType<typeof epRow>)[]>;
  intents: Record<string, IntentSchema[]>;
  invariants: Record<string, Invariant[]>;
  tiers: Record<string, Tier[]>;
  packages: Package[];
  deployments: Deployment[];
  events: Record<string, ProtocolEvent[]>;
  adminQueue: Record<string, AdminAction[]>;
  settings: Record<string, Settings>;
  waitlist: { email: string; protocolType: string }[];
}

const KEY = "kronos.mock.v4";
const uuid = () => crypto.randomUUID();
const now = () => Date.now();
const iso = (t = now()) => new Date(t).toISOString();

function epRow(runId: string, e: (typeof ENTRYPOINTS)[number]) {
  return { id: uuid(), runId, contract: e.contract, signature: e.signature, selector: e.selector, kind: e.kind, role: e.role, notes: e.notes, key: e.key };
}

let state: MockState | null = null;

export function db(): MockState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as MockState;
  } catch {}
  if (!state) {
    state = empty();
    seedLiveDemo(state);
    save();
  }
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function resetMockDb() {
  state = empty();
  seedLiveDemo(state);
  save();
}

function empty(): MockState {
  return {
    version: 4,
    users: {},
    protocols: [],
    runs: {},
    entrypoints: {},
    intents: {},
    invariants: {},
    tiers: {},
    packages: [],
    deployments: [],
    events: {},
    adminQueue: {},
    settings: {},
    waitlist: [],
  };
}

// ---------------------------------------------------------------- the scripted analysis run

function push(run: MockRun, t: number, type: RunEvent["type"], stage: string, message: string, payload?: unknown, effects?: Effect[], level?: RunEvent["level"]) {
  const id = run.nextId++;
  run.script.push({
    at: t,
    ev: { id, runId: run.id, type, stage, level: level ?? (type === "error" ? "error" : "info"), message, payload, ts: iso(t) },
    effects,
  });
}

function scriptAnalysis(s: MockState, run: MockRun, p: Protocol) {
  let t = now() + 400;
  const step = (ms: number) => (t += ms);
  const repo = p.repoUrl ?? "sample://minilend";
  const isLending = !/bridge|dex|amm|perp|vault/i.test(`${repo} ${p.websiteUrl ?? ""} ${p.name}`);

  push(run, step(0), "stage", "ingest", "Ingest: fetching sources", undefined, [{ kind: "run", status: "running", stage: "ingest" }, { kind: "protocol", status: "analyzing" }]);
  if (repo.startsWith("sample://")) push(run, step(500), "log", "ingest", `Loaded built-in sample "minilend" (4 files)`);
  else push(run, step(600), "log", "ingest", `Cloning ${repo.replace(/^https?:\/\/github\.com\//, "")} with GitHub App token`);
  push(run, step(700), "log", "ingest", "Cloned 3f9a1c2e7b: 4 Solidity files (Foundry project)");
  if (p.websiteUrl) push(run, step(500), "log", "ingest", "Website: 2 addresses and 3 docs links found (used as hints only, never as source of truth)");
  push(run, step(400), "log", "ingest", "Source snapshot stored (38.2 KB, sha256 9c1e0f4a2b7d)");
  push(run, step(500), "log", "ingest", "Compiling with forge to extract the AST (call graph, state variables, modifiers)");
  push(run, step(900), "log", "ingest", "AST: 4 contracts (solc 0.8.24), MiniLend, MiniLendCore deployable");
  push(run, step(400), "log", "ingest", "Running Slither");
  push(run, step(800), "log", "ingest", "Slither: 2 low, 3 informational");
  if (!isLending) {
    push(run, step(700), "log", "ingest", "Classified as bridge (91%): lock/mint pair across chains; message relayer; no borrow or collateral state");
    push(run, step(300), "error", "failed", "Bridges and other types coming soon. Join the waitlist to hear first.", { code: "UNSUPPORTED_TYPE" }, [
      { kind: "run", status: "failed", finished: true },
      { kind: "protocol", status: "unsupported", type: "bridge" },
    ]);
    return;
  }
  push(run, step(700), "log", "ingest", "Classified as lending (97%): borrow/repay/liquidate entry points; collateral factors; oracle getter");

  push(run, step(500), "stage", "map", "Mapper agent: listing entry points (provider: near-ai)", undefined, [{ kind: "run", stage: "map" }]);
  for (const e of s.entrypoints[run.id] ?? []) {
    push(run, step(260), "entrypoint", "map", `${e.role === "user" ? "User" : "Privileged"} ${e.kind}: ${e.signature}`, e);
  }
  push(run, step(400), "log", "map", "Main contract MiniLend (logic in MiniLendCore); adapter: compound-v2");

  push(run, step(500), "stage", "schema", "Schema agent: one EIP-712 intent per user entry point", undefined, [{ kind: "run", stage: "schema" }]);
  push(run, step(900), "log", "schema", "6 intent types: DepositIntent, WithdrawIntent, BorrowIntent, RepayIntent, LiquidateIntent, FlashLoanIntent");

  push(run, step(500), "stage", "invariants", "Invariant drafters A and B: filling template slots independently", undefined, [{ kind: "run", stage: "invariants" }]);
  for (const i of s.invariants[run.id] ?? []) {
    push(run, step(450), "invariant", "invariants", `${i.title}${i.needsReview ? " — drafters disagree, flagged for review" : " — both drafters agree"}`, {
      id: i.id,
      template: i.template,
      params: i.params,
      drafters: i.drafters,
      needsReview: i.needsReview,
    }, undefined, i.needsReview ? "warn" : "info");
  }

  push(run, step(500), "stage", "tiers", "Tier classifier: timelock tier per privileged function (hard rules override)", undefined, [{ kind: "run", stage: "tiers" }]);
  push(run, step(700), "log", "tiers", "8 privileged functions: 1 × tier 0, 2 × tier 1, 2 × tier 2, 3 × tier 3-equivalent rules; 4 set by hard rules");

  push(run, step(500), "stage", "redteam", "Red-team agent: choosing exploits to run against the drafted guard", undefined, [{ kind: "run", stage: "redteam" }]);
  push(run, step(900), "log", "redteam", "Planned 6 exploits: oracle pump, donation share inflation, rounding loop, reentrancy, fake collateral listing, split withdrawals");

  push(run, step(500), "stage", "verify", "Verifier: compiling the guard and replaying attacks on a fork", undefined, [{ kind: "run", stage: "verify" }]);
  push(run, step(600), "log", "verify", "Outflow window: 24h net; threshold 250000, 120 (p99.9 of 90 days)");
  push(run, step(600), "log", "verify", `Generated GuardConfig.MiniLend.sol and GuardedMiniLend.sol (config hash ${CONFIG_HASH.slice(0, 10)}…); compiling`);
  push(run, step(1100), "log", "verify", "Compiled. Running normal-traffic and attack replays (forge)");
  const attacks = (TEST_REPORT.details as { attacks: { name: string; blocked: boolean; at: string }[] }).attacks;
  for (const a of attacks) push(run, step(550), "log", "verify", `BLOCKED: ${a.name} at ${a.at}`, { name: a.name, blocked: a.blocked, at: a.at, applies: true });
  push(run, step(500), "log", "verify", "Normal traffic: 12/12 flows pass");
  push(run, step(500), "log", "verify", "Replaying 200 recent transactions on an anvil fork at block 18234117");
  push(run, step(1200), "log", "verify", "Fork replay: 200/200 pass, 0 false positives");
  push(run, step(400), "done", "review", "Analysis complete: 6/6 attacks blocked, 212/212 normal flows pass. Ready for review.", { attacksBlocked: 6, attacksTotal: 6, note: null }, [
    { kind: "run", status: "review", stage: "review", finished: true },
    { kind: "protocol", status: "review" },
  ]);
}

export function scriptPackaging(run: MockRun) {
  let t = now();
  const step = (ms: number) => (t += ms);
  push(run, step(0), "stage", "review", "Review approved by the protocol team; building package");
  push(run, step(700), "stage", "package", "Package builder: assembling the approved guard package", undefined, [{ kind: "run", status: "packaging", stage: "package" }]);
  push(run, step(700), "log", "package", "Rendering GuardConfig.MiniLend.sol with the approved invariants and parameters");
  push(run, step(600), "log", "package", "Inserting guarded(...) on 6 user entry points");
  push(run, step(600), "log", "package", "Routing 8 privileged functions through GuardTimelock");
  push(run, step(600), "log", "package", "Writing attack-library tests (6) and normal-traffic replays (12)");
  push(run, step(500), "log", "package", "Writing script/DeployKronos.s.sol and INTEGRATION.md");
  push(run, step(700), "log", "package", "Package v1.0.0: 8 files, 46.8 KB, sha256 4be1a9c03d7f");
  push(run, step(300), "done", "package", `Package v1.0.0 ready (config hash ${CONFIG_HASH.slice(0, 10)}…). Open the integration PR or download the zip.`, null, [
    { kind: "package" },
    { kind: "run", status: "packaged", stage: "packaged" },
    { kind: "protocol", status: "integrating" },
  ]);
}

/** Apply the side effects of every scripted event whose time has come. */
export function advance() {
  const s = db();
  let changed = false;
  for (const run of Object.values(s.runs)) {
    for (const sc of run.script) {
      if (sc.at > now() || !sc.effects?.length) continue;
      for (const e of sc.effects) applyEffect(s, run, e, sc.at);
      sc.effects = undefined;
      changed = true;
    }
  }
  if (changed) save();
}

function applyEffect(s: MockState, run: MockRun, e: Effect, at: number) {
  const p = s.protocols.find((x) => x.id === run.protocolId);
  if (e.kind === "run") {
    if (e.status) run.status = e.status;
    if (e.stage) run.stage = e.stage;
    if (e.status === "running" && !run.startedAt) run.startedAt = iso(at);
    if (e.finished) run.finishedAt = iso(at);
  } else if (e.kind === "protocol" && p) {
    p.status = e.status;
    if (e.type) p.type = e.type;
    p.updatedAt = iso(at);
  } else if (e.kind === "package" && !s.packages.some((x) => x.runId === run.id)) {
    const files = packageFiles(p?.name?.replace(/\W/g, "") || "MiniLend");
    s.packages.push({
      id: uuid(),
      runId: run.id,
      version: "1.0.0",
      configHash: CONFIG_HASH,
      downloadUrl: "",
      prUrl: null,
      createdAt: iso(at),
      manifest: {
        version: "1.0.0",
        configHash: CONFIG_HASH,
        files: files.map((f) => ({ path: f.path, sha256: "", bytes: f.content.length })),
        guardedFunctions: ENTRYPOINTS.filter((x) => x.role === "user").map((x) => ({ name: x.key, kind: x.kind, signature: x.signature })),
        privileged: (s.tiers[run.id] ?? []).map((t) => ({
          signature: (s.entrypoints[run.id] ?? []).find((r) => r.id === t.entrypointId)?.signature ?? "",
          tier: t.tier,
        })),
        prTitle: "Integrate Kronos guard (v1.0.0)",
        prBody: "This PR adds the Kronos guard approved in review.",
        diffPreview: {
          added: files.map((f) => f.path),
          summary: `${files.length} files: generated GuardConfig + GuardedMiniLend, attack-library tests, deploy script, config, docs`,
          generated: files,
        },
        warnings: [],
      },
    });
  }
}

export function visibleEvents(run: MockRun, afterId: number) {
  return run.script.filter((x) => x.at <= now() && x.ev.id > afterId).map((x) => x.ev);
}

export function nextEventAt(run: MockRun, afterId: number) {
  const n = run.script.find((x) => x.ev.id > afterId);
  return n?.at;
}

// ---------------------------------------------------------------- creation helpers

export function createProtocol(ownerId: string, body: { name?: string; websiteUrl?: string; repoUrl?: string; chainId: number; addresses?: string[] }) {
  const s = db();
  const nameFromRepo = body.repoUrl?.replace(/\/+$/, "").split("/").filter(Boolean).slice(-1)[0];
  const t = iso();
  const p: Protocol & { ownerId?: string } = {
    id: uuid(),
    name: body.name || (nameFromRepo && !nameFromRepo.startsWith("sample:") ? titleCase(nameFromRepo) : "MiniLend"),
    websiteUrl: body.websiteUrl ?? null,
    repoUrl: body.repoUrl ?? null,
    chainId: body.chainId,
    addresses: body.addresses ?? [],
    type: "lending",
    status: "draft",
    latestRunId: null,
    createdAt: t,
    updatedAt: t,
  };
  s.protocols.unshift(p);
  const run = startRun(s, p);
  save();
  return { protocol: p, run };
}

function titleCase(x: string) {
  if (/minilend/i.test(x)) return "MiniLend";
  return x.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function startRun(s: MockState, p: Protocol) {
  const run: MockRun = {
    id: uuid(),
    protocolId: p.id,
    commitSha: "3f9a1c2e7b4d8a0f1e2c3b4a5d6e7f8091a2b3c4",
    status: "queued",
    stage: "ingest",
    tokenCost: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: iso(),
    script: [],
    nextId: 1,
  };
  s.runs[run.id] = run;
  p.latestRunId = run.id;
  s.entrypoints[run.id] = ENTRYPOINTS.map((e) => epRow(run.id, e));
  s.intents[run.id] = (s.entrypoints[run.id] ?? [])
    .filter((e) => e.role === "user")
    .map((e) => ({ id: uuid(), entrypointId: e.id, ...intentFor(ENTRYPOINTS.find((x) => x.key === e.key)!, p.chainId) }));
  s.invariants[run.id] = INVARIANTS.map(({ key: _k, ...i }) => ({ ...i, id: uuid(), params: { ...i.params } }));
  s.tiers[run.id] = (s.entrypoints[run.id] ?? [])
    .filter((e) => e.role === "privileged")
    .map((e) => {
      const plan = TIER_PLAN[e.key] ?? { tier: 1, source: "agent" as const, rationale: "Routine change." };
      return { id: uuid(), entrypointId: e.id, tier: plan.tier, delaySeconds: [0, 172800, 604800, 1209600][plan.tier]!, source: plan.source, rationale: plan.rationale, status: "proposed" as const };
    });
  scriptAnalysis(s, run, p);
  return run;
}

export function results(runId: string) {
  const s = db();
  const run = s.runs[runId]!;
  const { script: _s, nextId: _n, ...r } = run;
  return {
    run: r,
    entrypoints: (s.entrypoints[runId] ?? []).map(({ runId: _r, key: _k, ...e }) => e),
    intentSchemas: s.intents[runId] ?? [],
    invariants: s.invariants[runId] ?? [],
    tiers: s.tiers[runId] ?? [],
    thresholds: THRESHOLDS,
    testReport: { id: `tr-${runId.slice(0, 8)}`, ...TEST_REPORT },
  };
}

export function publicRun(run: MockRun): Run {
  const { script: _s, nextId: _n, ...r } = run;
  return r;
}

// ---------------------------------------------------------------- deployments + live monitoring

export function verifyDeployment(p: Protocol, body: { chainId: number; guardAddress: string; timelockAddress?: string; registryAddress?: string }) {
  const s = db();
  const pkg = s.packages.find((x) => x.runId === p.latestRunId);
  const bad = /dead$/i.test(body.guardAddress);
  const checks: VerifyCheck[] = [
    { name: "config hash matches the approved package", ok: !bad, detail: bad ? `on-chain kronosConfigHash() = 0x51ab…09e2, approved ${CONFIG_HASH.slice(0, 10)}…: redeploy from package v1.0.0` : `kronosConfigHash() = ${CONFIG_HASH.slice(0, 10)}…` },
    { name: "deposit() reverts without a valid intent", ok: true, detail: "IntentRequired()" },
    { name: "withdraw() reverts without a valid intent", ok: true, detail: "IntentRequired()" },
    { name: "borrow() reverts without a valid intent", ok: true, detail: "IntentRequired()" },
    { name: "repay() reverts without a valid intent", ok: true, detail: "IntentRequired()" },
    { name: "liquidate() reverts without a valid intent", ok: true, detail: "IntentRequired()" },
    { name: "flashLoan() reverts without a valid intent", ok: true, detail: "IntentRequired()" },
    { name: "guard is owned by the timelock", ok: true, detail: `kronosTimelock() = ${body.timelockAddress ?? "0x7d1c…a3f0"}` },
    { name: "timelock setup closed", ok: true, detail: "finalizeSetup() called" },
    { name: "monitor subscribed", ok: !bad, detail: bad ? "skipped until the config hash matches" : "watching from block 18240311" },
    { name: "first attestation received", ok: !bad, detail: bad ? "skipped until the config hash matches" : "block 18240312 · oracle ok · solvency ok" },
  ];
  const verified = checks.every((c) => c.ok);
  const d: Deployment = {
    id: uuid(),
    protocolId: p.id,
    packageId: pkg?.id ?? null,
    chainId: body.chainId,
    guardAddress: body.guardAddress,
    timelockAddress: body.timelockAddress ?? "0x7d1c4e0b9a2f6c3d8e5b1a0f9c7d2e4b6a8c3f0a",
    registryAddress: body.registryAddress ?? null,
    verified,
    checks,
    verifiedAt: verified ? iso() : null,
    createdAt: iso(),
  };
  // Registering again on the same chain replaces the earlier entry.
  s.deployments = s.deployments.filter((x) => !(x.protocolId === p.id && x.chainId === d.chainId));
  s.deployments.unshift(d);
  if (verified) {
    p.status = "live";
    p.updatedAt = iso();
    if (!s.events[p.id]?.length) seedMonitoring(s, p.id, d.chainId);
  }
  save();
  return d;
}

function seedMonitoring(s: MockState, protocolId: string, chainId: number) {
  const h = 3600_000;
  const t = now();
  const ev = (minsAgo: number, kind: string, extra: Partial<ProtocolEvent>): ProtocolEvent => ({
    id: uuid(),
    kind,
    chainId,
    txHash: `0x${Array.from({ length: 64 }, (_, i) => "0123456789abcdef"[(minsAgo * 7 + i * 13 + kind.length) % 16]).join("")}`,
    invariantId: null,
    asset: null,
    amount: null,
    data: {},
    ts: iso(t - minsAgo * 60_000),
    ...extra,
  });
  s.events[protocolId] = [
    ev(3, "blocked", { invariantId: "checkOracle", asset: USDC, amount: "2400000000000", data: { function: "borrow", error: "OracleDeviation", from: "0x9f3e…71aa" } }),
    ev(16, "queued", { asset: USDC, amount: "180000000000", invariantId: "outflowWindow", data: { function: "withdraw", claimId: "7", releaseAt: iso(t + 14 * 60_000) } }),
    ev(48, "released", { asset: USDC, amount: "12500000000", invariantId: "outflowWindow", data: { function: "withdraw", claimId: "6", reason: "fresh attestation" } }),
    ev(92, "admin_queued", { invariantId: "tier2Timelock", data: { function: "listMarket", actionId: 3, tier: 2, functionName: "listMarket(address,address,uint256)" } }),
    ev(117, "blocked", { invariantId: "checkSharePrice", asset: USDC, amount: "890000000000", data: { function: "borrow", error: "SharePriceDelta" } }),
    ev(145, "released", { asset: USDC, amount: "64200000000", data: { function: "repay" } }),
    ev(5 * 60, "blocked", { invariantId: "checkHealth", asset: WETH, amount: "41000000000000000000", data: { function: "withdraw", error: "HealthTooLow" } }),
    ev(9 * 60, "alert", { data: { title: "Outflow at 71% of the 24h window", function: "withdraw" } }),
    ev(13 * 60, "blocked", { invariantId: "checkOracle", asset: USDC, amount: "1100000000000", data: { function: "borrow", error: "OracleDeviation" } }),
    ev(17 * 60, "admin_cancelled", { invariantId: "tier2Timelock", data: { function: "setOracle", actionId: 2, functionName: "setOracle(address,address)" } }),
    ev(21 * 60, "blocked", { invariantId: "checkCap", asset: WETH, amount: "300000000000000000000", data: { function: "deposit", error: "CapExceeded" } }),
    ev(23 * 60, "blocked", { invariantId: "intentBounds", asset: USDC, amount: "50000000000", data: { function: "borrow", error: "IntentBoundsExceeded" } }),
  ];
  s.adminQueue[protocolId] = [
    {
      id: uuid(),
      chainId,
      actionId: 3,
      target: "0x5b2e…41c9",
      selector: "0x3e4f5a6b",
      functionName: "listMarket(FAKE,0x6b11…c3e2,7500)",
      tier: 2,
      eta: new Date(t + (6 * 24 + 11) * h + 8 * 60_000).toISOString(),
      proposer: "0x6b11a0c9e5d24f7b8a31c0d9e2f4a6b8c0d1c3e2",
      status: "queued",
      txHash: "0x0b77d2e1f4a8c6b9e0d3f1a5c7e9b2d4f6a8c0e2b4d6f8a0c2e4b6d8f0a2e441",
    },
  ];
  s.settings[protocolId] = {
    thresholds: { [USDC]: { threshold: "250000000000", staleLimit: "50000000000" }, [WETH]: { threshold: "120000000000000000000", staleLimit: "20000000000000000000" } },
    alerts: { webhookUrl: null, telegramChatId: null, discordWebhookUrl: null },
    autoTighten: true,
  };
}

/** A LIVE sample protocol so /p and the dashboard have something to show on first load. */
function seedLiveDemo(s: MockState) {
  const owner = "user-demo";
  s.users[owner] = { id: owner, githubLogin: "demo", walletAddress: null, nearAccount: null, githubAppInstalled: true, createdAt: iso() };
  const t = iso(now() - 3 * 86400_000);
  const p: Protocol = {
    id: "8c21a04f-0000-4000-8000-000000000001",
    name: "MiniLend (sample)",
    websiteUrl: "https://minilend.example",
    repoUrl: "sample://minilend",
    chainId: BASE_SEPOLIA,
    addresses: [],
    type: "lending",
    status: "live",
    latestRunId: null,
    createdAt: t,
    updatedAt: t,
  };
  s.protocols.push(p);
  const run = startRun(s, p);
  // Fast-forward the sample run: everything already happened.
  for (const sc of run.script) sc.at = now() - 3 * 86400_000;
  scriptPackaging(run);
  for (const sc of run.script) sc.at = Math.min(sc.at, now() - 3 * 86400_000 + 60_000);
  for (const i of s.invariants[run.id] ?? []) i.status = "approved";
  for (const i of s.intents[run.id] ?? []) i.status = "approved";
  for (const i of s.tiers[run.id] ?? []) i.status = "approved";
  state = s;
  advance();
  p.status = "live";
  const pkg = s.packages.find((x) => x.runId === run.id);
  s.deployments.push({
    id: uuid(),
    protocolId: p.id,
    packageId: pkg?.id ?? null,
    chainId: BASE_SEPOLIA,
    guardAddress: "0x8c21e4b7d0a9f3c6e1b5d8a2f7c4e9b0d3a6a04f",
    timelockAddress: "0x7d1c4e0b9a2f6c3d8e5b1a0f9c7d2e4b6a8c3f0a",
    registryAddress: null,
    verified: true,
    checks: [],
    verifiedAt: t,
    createdAt: t,
  });
  // The sample is live on both chains, like the real MiniLend demo: same addresses, one card each.
  s.deployments.push({ ...s.deployments[s.deployments.length - 1]!, id: uuid(), chainId: AURORA_TESTNET });
  seedMonitoring(s, p.id, BASE_SEPOLIA);
  // A few of the sample's events happened on Aurora, so the chain chips and filter have both.
  (s.events[p.id] ?? []).forEach((e, i) => {
    if (i % 4 === 2) e.chainId = AURORA_TESTNET;
  });
}

export function overview(p: Protocol) {
  const s = db();
  const mine = s.deployments.filter((x) => x.protocolId === p.id);
  // latest deployment per chain
  const deployments = [...new Map(mine.map((d) => [d.chainId, d] as const).reverse()).values()];
  const d = mine.find((x) => x.verified) ?? mine[0];
  const evs = (s.events[p.id] ?? []).filter((e) => now() - new Date(e.ts).getTime() < 86400_000);
  const count = (k: string) => evs.filter((e) => e.kind === k).length;
  const queued = evs.filter((e) => e.kind === "queued" && !(e.data as { released?: boolean })?.released);
  const att = (chainId: number, i: number) => ({
    chainId,
    block: (chainId === AURORA_TESTNET ? 231_400_000 : 18_240_312) + Math.floor((now() / 1000 - 1762700000) / 2),
    ageSeconds: Math.round(((now() / 1000 + i * 9) % 24) + 2 + i * 31),
    oracleOk: true,
    solvencyOk: true,
    postedTx: `0x3a9f1c0e2d4b6a8c0e2f4a6b8d0c2e4f6a8b0d2c4e6f8a0b2d4c6e8f0a2b4d6${i}`,
  });
  const attestations = deployments.filter((x) => x.verified).map((x, i) => att(x.chainId, i));
  return {
    protocol: p,
    deployment: d ?? null,
    deployments,
    stats24h: { blocked: count("blocked"), queued: count("queued"), released: count("released"), adminQueued: count("admin_queued"), alerts: count("alert") },
    attestation: attestations[0] ?? null,
    attestations,
    queuedOutflow: queued.map((e) => ({ asset: e.asset ?? USDC, amount: e.amount ?? "0", claims: 1 })),
    pendingAdminActions: (s.adminQueue[p.id] ?? []).filter((a) => a.status === "queued").length,
  };
}
