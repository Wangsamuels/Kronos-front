"use client";
import * as T from "@radix-ui/react-tooltip";

export function Tip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <T.Root delayDuration={200}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content sideOffset={6} className="z-50 max-w-xs rounded-ctl border border-line-2 bg-surface-2 px-3 py-2 text-13 leading-snug text-text-2 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)]">
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
