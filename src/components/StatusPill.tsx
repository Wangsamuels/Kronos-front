import { cn } from "@/lib/cn";

export type PillTone = "pass" | "block" | "queue" | "neutral";

const tones: Record<PillTone, string> = {
  pass: "border-pass/40 bg-pass/10 text-pass",
  block: "border-block/40 bg-block/10 text-block",
  queue: "border-queue/40 bg-queue/10 text-queue",
  neutral: "border-line bg-surface-2 text-text-2",
};

/** Colour by meaning only, always paired with a word. */
export function StatusPill({ tone, children, className }: { tone: PillTone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center rounded-ctl border px-2 font-mono text-11 uppercase tracking-[0.06em]", tones[tone], className)}>{children}</span>;
}

/** LIVE / PAUSED / ATTESTATION STALE / ANALYZING … for a protocol. */
export function ProtocolStatusPill({ status, stale }: { status: string; stale?: boolean }) {
  if (status === "live" && stale) return <StatusPill tone="block">Attestation stale</StatusPill>;
  const map: Record<string, [PillTone, string]> = {
    live: ["pass", "Live"],
    paused: ["queue", "Paused"],
    analyzing: ["neutral", "Analyzing"],
    draft: ["neutral", "Draft"],
    review: ["queue", "In review"],
    approved: ["neutral", "Packaging"],
    integrating: ["neutral", "Integrating"],
    unsupported: ["neutral", "Waitlist"],
  };
  const [tone, label] = map[status] ?? ["neutral", status];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export function VerdictDot({ kind }: { kind: string }) {
  const tone = kind === "blocked" || kind === "alert" ? "bg-block" : kind === "queued" || kind === "admin_queued" ? "bg-queue" : kind === "released" || kind === "admin_cancelled" || kind === "admin_executed" ? "bg-pass" : "bg-text-3";
  return <span aria-hidden className={cn("inline-block size-1.5 shrink-0 rounded-full", tone)} />;
}

export function verdictText(kind: string) {
  return kind === "blocked" || kind === "alert" ? "text-block" : kind.includes("queued") ? "text-queue" : kind === "released" || kind === "admin_cancelled" ? "text-pass" : "text-text-2";
}
