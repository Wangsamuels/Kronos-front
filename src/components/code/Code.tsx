"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { Lang } from "@/lib/shiki";

/** Client-side, lazy Shiki: plain mono text first, highlighted when the highlighter has loaded. */
export function Code({ code, lang, className, html: preHtml }: { code: string; lang: Lang; className?: string; html?: string }) {
  const [html, setHtml] = useState<string | null>(preHtml ?? null);
  useEffect(() => {
    if (preHtml) return;
    let live = true;
    void import("@/lib/shiki").then(({ highlight }) => highlight(code, lang)).then((h) => live && setHtml(h)).catch(() => {});
    return () => {
      live = false;
    };
  }, [code, lang, preHtml]);
  if (html) return <div className={cn("k-shiki", className)} dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <div className={cn("k-shiki", className)}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className={cn("h-8 rounded-ctl border border-line px-2.5 font-mono text-11 uppercase tracking-[0.06em] text-text-2 hover:border-text-3 hover:text-text", className)}
      aria-live="polite"
    >
      {done ? "copied" : "copy"}
    </button>
  );
}
