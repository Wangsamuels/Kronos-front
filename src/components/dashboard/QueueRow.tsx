"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { duration, short } from "@/lib/format";

/** Queued item with ETA countdown and a guarded action (cancel / release) behind confirm + wallet signature. */
export function QueueRow({
  badge,
  chain,
  badgeTone = "queue",
  action,
  proposer,
  eta,
  etaPrefix,
  actionLabel,
  confirmTitle,
  confirmBody,
  onConfirm,
  danger = true,
}: {
  badge: string;
  /** Shown when the protocol is live on more than one chain. */
  chain?: string;
  badgeTone?: "queue" | "block";
  action: string;
  proposer?: string | null;
  eta?: string | null;
  etaPrefix?: string;
  actionLabel: string;
  confirmTitle: string;
  confirmBody: React.ReactNode;
  onConfirm: () => Promise<void>;
  danger?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = eta ? Math.max(0, Math.round((new Date(eta).getTime() - now) / 1000)) : null;
  return (
    <li className="grid grid-cols-2 items-center gap-x-4 gap-y-2.5 border-b border-line px-4 py-4 last:border-b-0 md:grid-cols-12 md:gap-3 md:px-5 md:py-3.5">
      <span className="col-span-2 md:col-span-3">
        <StatusPill tone={badgeTone}>{badge}</StatusPill>
        {chain ? <span className="ml-2 font-mono text-11 uppercase tracking-[0.04em] text-text-3">{chain}</span> : null}
      </span>
      <span className="col-span-2 truncate font-mono text-15 text-text md:col-span-3 md:text-13" title={action}>
        {action}
      </span>
      <span className="font-mono text-13 text-text-2 md:col-span-2">
        <span className="mr-2 text-11 uppercase tracking-[0.06em] text-text-3 md:hidden">by</span>
        {proposer ? short(proposer) : "—"}
      </span>
      <span className="k-tnum text-right font-mono text-13 text-queue md:col-span-2 md:text-left" aria-live="off">
        {left === null ? "—" : left === 0 ? "eta reached" : `${etaPrefix ?? ""}${duration(left)}`}
      </span>
      <span className="col-span-2 md:col-span-2 md:text-right">
        <Button size="sm" className="w-full md:w-auto" variant={danger ? "danger" : "secondary"} onClick={() => setOpen(true)}>
          {actionLabel}
        </Button>
      </span>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={confirmTitle}
        confirmLabel={`${actionLabel} · sign in wallet`}
        tone={danger ? "danger" : "primary"}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await onConfirm();
            setOpen(false);
          } finally {
            setBusy(false);
          }
        }}
      >
        {confirmBody}
      </ConfirmDialog>
    </li>
  );
}
