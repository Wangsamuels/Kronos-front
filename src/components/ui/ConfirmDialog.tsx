"use client";
import * as D from "@radix-ui/react-dialog";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  tone = "danger",
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm" />
        <D.Content className="fixed left-1/2 top-1/2 z-50 w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line-2 bg-surface p-6 shadow-[0_32px_96px_-24px_rgb(0_0_0/0.9)] focus:outline-none">
          <D.Title className="text-22 font-medium">{title}</D.Title>
          <D.Description asChild>
            <div className="mt-3 text-15 text-text-2">{children}</div>
          </D.Description>
          <div className="mt-7 flex flex-col-reverse gap-2 border-t border-line pt-5 min-[480px]:flex-row min-[480px]:justify-end">
            <D.Close asChild>
              <Button variant="secondary">Keep it</Button>
            </D.Close>
            <Button variant={tone} busy={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
