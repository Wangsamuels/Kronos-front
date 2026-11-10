"use client";
import * as Tabs from "@radix-ui/react-tabs";
import { Code, CopyButton } from "./Code";
import type { Lang } from "@/lib/shiki";
import { cn } from "@/lib/cn";

export interface CodeTab {
  id: string;
  label: string;
  code: string;
  lang: Lang;
  /** Pre-highlighted on the server at build time when available. */
  html?: string;
}

export function CodeTabs({ tabs, className }: { tabs: CodeTab[]; className?: string }) {
  return (
    <Tabs.Root defaultValue={tabs[0]?.id} className={cn("k-panel overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line pr-2">
        <Tabs.List aria-label="Code samples" className="flex overflow-x-auto">
          {tabs.map((t) => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="h-11 border-r border-line px-4 font-mono text-13 text-text-3 data-[state=active]:bg-surface-2 data-[state=active]:text-text hover:text-text"
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>
      {tabs.map((t) => (
        <Tabs.Content key={t.id} value={t.id} className="relative bg-surface-2 focus-visible:outline-offset-[-2px]">
          <CopyButton text={t.code} className="absolute right-3 top-3 bg-surface-2" />
          <Code code={t.code} lang={t.lang} html={t.html} />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
