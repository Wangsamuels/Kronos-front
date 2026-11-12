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
    <Tabs.Root defaultValue={tabs[0]?.id} className={cn("overflow-hidden rounded-panel border border-line-2 bg-surface", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line pr-2">
        <Tabs.List aria-label="Code samples" className="flex overflow-x-auto">
          {tabs.map((t) => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="relative h-12 shrink-0 whitespace-nowrap px-4 font-mono text-13 text-text-3 transition-colors duration-k after:absolute after:inset-x-4 after:-bottom-px after:h-px after:bg-transparent hover:text-text data-[state=active]:text-text data-[state=active]:after:bg-text sm:px-5 sm:after:inset-x-5"
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>
      {tabs.map((t) => (
        <Tabs.Content key={t.id} value={t.id} className="relative bg-surface-2 pt-9 focus-visible:outline-offset-[-2px] md:pt-0">
          <CopyButton text={t.code} className="absolute right-3 top-3 z-10 bg-surface-2" />
          <Code code={t.code} lang={t.lang} html={t.html} />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
