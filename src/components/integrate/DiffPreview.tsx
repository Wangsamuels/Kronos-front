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
    <div className="k-panel overflow-hidden">
      {summary ? <p className="border-b border-line px-5 py-3 font-mono text-13 text-text-2">{summary}</p> : null}
      <div className="grid md:grid-cols-[260px_1fr]">
        <nav aria-label="Changed files" className="max-h-[420px] overflow-y-auto border-b border-line md:border-b-0 md:border-r">
          <ul className="py-2">
            {files.map((f) => (
              <li key={f.path}>
                <button
                  onClick={() => setSel(f.path)}
                  aria-current={f.path === file?.path}
                  className={cn("flex w-full items-center gap-2 px-4 py-1.5 text-left font-mono text-13", f.path === file?.path ? "bg-surface-2 text-text" : "text-text-2 hover:text-text")}
                >
                  <span className={f.status === "modified" ? "text-queue" : "text-pass"}>{f.status === "modified" ? "M" : "A"}</span>
                  <span className="truncate" title={f.path}>
                    {f.path}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="max-h-[420px] overflow-auto bg-surface-2/50">
          <div className="sticky top-0 flex justify-between border-b border-line bg-surface px-4 py-2 font-mono text-11 text-text-3">
            <span>{file?.path}</span>
            <span className="text-pass">+{lines.length}</span>
          </div>
          <pre className="font-mono text-13 leading-relaxed">
            {lines.map((l, i) => (
              <div key={i} className="flex hover:bg-pass/5">
                <span className="k-tnum w-12 shrink-0 select-none pr-3 text-right text-text-3">{i + 1}</span>
                <span className="w-4 shrink-0 select-none text-pass">+</span>
                <span className="whitespace-pre pr-4 text-text-2">{l || " "}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
