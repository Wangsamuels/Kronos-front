"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface DiffFile {
  path: string;
  content: string;
  status?: "added" | "modified";
}

/** Unified diff of the PR with a file tree on the left. Generated files are all additions. */
export function DiffPreview({ files, summary }: { files: DiffFile[]; summary?: string }) {
  const [sel, setSel] = useState(files[0]?.path);
  const file = files.find((f) => f.path === sel) ?? files[0];
  const lines = file?.content.replace(/\n$/, "").split("\n") ?? [];
  return (
    <div className="overflow-hidden rounded-panel border border-line-2 bg-surface">
      <p className="k-bar normal-case tracking-normal">
        <span className="truncate text-13 text-text-2">{summary ?? "Pull request preview"}</span>
        <span className="k-tnum shrink-0 text-11 uppercase tracking-[0.06em]">{files.length} files</span>
      </p>
      <div className="grid md:grid-cols-[260px_1fr]">
        <nav aria-label="Changed files" className="max-h-[200px] overflow-y-auto border-b border-line md:max-h-[440px] md:border-b-0 md:border-r">
          <ul className="py-1.5">
            {files.map((f) => {
              const on = f.path === file?.path;
              const slash = f.path.lastIndexOf("/");
              return (
                <li key={f.path}>
                  <button
                    onClick={() => setSel(f.path)}
                    aria-current={on}
                    title={f.path}
                    className={cn("relative flex min-h-9 w-full items-center gap-2.5 px-4 text-left font-mono text-13 transition-colors duration-k", on ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface-2/50 hover:text-text")}
                  >
                    {on ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-text" /> : null}
                    <span className={cn("grid size-4 shrink-0 place-items-center rounded-[3px] text-[10px]", f.status === "modified" ? "bg-queue/15 text-queue" : "bg-pass/15 text-pass")}>{f.status === "modified" ? "M" : "A"}</span>
                    <span className="truncate">
                      <span className="text-text-3">{slash >= 0 ? f.path.slice(0, slash + 1) : ""}</span>
                      {slash >= 0 ? f.path.slice(slash + 1) : f.path}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="max-h-[440px] min-w-0 overflow-auto bg-surface-2/50">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 font-mono text-11 text-text-2">
            <span className="truncate">{file?.path}</span>
            <span className="k-tnum shrink-0 text-pass">+{lines.length}</span>
          </div>
          {file?.content ? (
            <pre className="py-2 font-mono text-13 leading-relaxed">
              {lines.map((l, i) => (
                <div key={i} className="flex hover:bg-pass/[0.06]">
                  <span className="k-tnum w-12 shrink-0 select-none pr-3 text-right text-text-3">{i + 1}</span>
                  <span className="w-4 shrink-0 select-none text-pass/70">+</span>
                  <span className="whitespace-pre pr-4 text-text-2">{l || " "}</span>
                </div>
              ))}
            </pre>
          ) : (
            <p className="px-4 py-6 text-13 text-text-3">No preview for this file. It is included in the package.</p>
          )}
        </div>
      </div>
    </div>
  );
}
