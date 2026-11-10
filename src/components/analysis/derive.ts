import type { RunEvent } from "@/api/types";

export interface Counters {
  contracts: number;
  entryUser: number;
  entryPrivileged: number;
  invariants: number;
  flagged: number;
  attacksTried: number;
  attacksBlocked: number;
  txReplayed: number;
  txPassed: number;
}

/** Counters fill in live from event payloads (and the worker's well-known log lines). */
export function deriveCounters(events: RunEvent[]): Counters {
  const c: Counters = { contracts: 0, entryUser: 0, entryPrivileged: 0, invariants: 0, flagged: 0, attacksTried: 0, attacksBlocked: 0, txReplayed: 0, txPassed: 0 };
  const inv = new Map<string, boolean>();
  let normal = { pass: 0, total: 0 };
  let fork = { pass: 0, total: 0 };
  for (const e of events) {
    const p = (e.payload ?? {}) as Record<string, unknown>;
    if (e.type === "entrypoint") {
      if (p.role === "privileged") c.entryPrivileged++;
      else c.entryUser++;
    } else if (e.type === "invariant") {
      const id = String(p.id ?? e.id);
      inv.set(id, !!p.needsReview);
    } else if (e.type === "log") {
      const ast = e.message.match(/^AST: (\d+) contracts/);
      if (ast) c.contracts = Number(ast[1]);
      const files = e.message.match(/(\d+) Solidity files/);
      if (files && !c.contracts) c.contracts = Number(files[1]);
      if (typeof p.blocked === "boolean" && (p.applies ?? true)) {
        c.attacksTried++;
        if (p.blocked) c.attacksBlocked++;
      }
      const nt = e.message.match(/^Normal traffic: (\d+)\/(\d+)/);
      if (nt) normal = { pass: Number(nt[1]), total: Number(nt[2]) };
      const fr = e.message.match(/^Fork replay: (\d+)\/(\d+)/);
      if (fr) fork = { pass: Number(fr[1]), total: Number(fr[2]) };
      const rp = e.message.match(/^Replaying (\d+) recent transactions/);
      if (rp && !fork.total) fork = { pass: 0, total: 0 };
    } else if (e.type === "done" && e.stage === "review") {
      if (typeof p.attacksTotal === "number") c.attacksTried = Math.max(c.attacksTried, p.attacksTotal);
      if (typeof p.attacksBlocked === "number") c.attacksBlocked = Math.max(c.attacksBlocked, p.attacksBlocked);
    }
  }
  c.invariants = inv.size;
  c.flagged = [...inv.values()].filter(Boolean).length;
  c.txReplayed = normal.total + fork.total;
  c.txPassed = normal.pass + fork.pass;
  return c;
}

export type Phase = "waiting" | "analyzing" | "review" | "packaging" | "packaged" | "failed" | "unsupported";

export function derivePhase(events: RunEvent[], runStatus?: string, protocolStatus?: string): Phase {
  if (protocolStatus === "unsupported") return "unsupported";
  const err = [...events].reverse().find((e) => e.type === "error");
  const lastDone = [...events].reverse().find((e) => e.type === "done");
  const last = events[events.length - 1];
  if (last?.type === "error" || (runStatus === "failed" && err)) {
    return (err?.payload as { code?: string } | undefined)?.code === "UNSUPPORTED_TYPE" ? "unsupported" : "failed";
  }
  if (runStatus === "failed") return "failed";
  if (lastDone?.stage === "package" || runStatus === "packaged") return "packaged";
  const approvedIdx = events.findIndex((e) => e.stage === "review" && e.type === "stage");
  if (approvedIdx >= 0 || runStatus === "approved" || runStatus === "packaging") return "packaging";
  if (lastDone?.stage === "review" || runStatus === "review") return "review";
  if (!events.length) return "waiting";
  return "analyzing";
}

export const PIPELINE = [
  { key: "ingest", label: "Ingest" },
  { key: "map", label: "Map" },
  { key: "schema", label: "Schemas" },
  { key: "invariants", label: "Invariants" },
  { key: "tiers", label: "Tiers" },
  { key: "redteam", label: "Red team" },
  { key: "verify", label: "Verify" },
  { key: "package", label: "Package" },
];
