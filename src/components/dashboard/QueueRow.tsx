"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { duration, short } from "@/lib/format";

/** Queued item with ETA countdown and a guarded action (cancel / release) behind confirm + wallet signature. */
export function QueueRow({
  badge,
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
    <li className="grid gap-3 border-b border-line px-5 py-3 last:border-b-0 md:grid-cols-12 md:items-center">
      <span className="md:col-span-3">
        <StatusPill tone={badgeTone}>{badge}</StatusPill>
      </span>
      <span className="truncate font-mono text-13 text-text md:col-span-4" title={action}>
        {action}
      </span>
      <span className="font-mono text-13 text-text-2 md:col-span-2">{proposer ? short(proposer) : "—"}</span>
      <span className="k-tnum font-mono text-13 text-text-2 md:col-span-2" aria-live="off">
        {left === null ? "—" : left === 0 ? "eta reached" : `${etaPrefix ?? ""}${duration(left)}`}
      </span>
      <span className="md:col-span-1 md:text-right">
        <Button size="sm" variant={danger ? "danger" : "secondary"} onClick={() => setOpen(true)}>
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
