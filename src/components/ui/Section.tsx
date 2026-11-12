import { cn } from "@/lib/cn";

export function SectionLabel({ n, children, className, as: As = "p" }: { n?: string; children: React.ReactNode; className?: string; as?: "p" | "h2" | "h3" }) {
  return (
    <As className={cn("k-label", className)}>
      {n ? <span className="text-text-3">{n} / </span> : null}
      {children}
    </As>
  );
}

export function Panel({ className, children, label, right, ...rest }: React.HTMLAttributes<HTMLElement> & { label?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className={cn("k-panel overflow-hidden", className)} {...rest}>
      {label || right ? (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="k-label">{label}</div>
          {right}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Homepage section header: index + label on one hairline, then a large title with the supporting
 * line set beside it on wide screens (below it on narrow ones).
 */
export function SectionHead({ n, label, title, lede, id, className }: { n: string; label: string; title: React.ReactNode; lede?: React.ReactNode; id?: string; className?: string }) {
  return (
    <header className={cn("mb-10 md:mb-14", className)}>
      <p className="flex items-center gap-3 font-mono text-11 uppercase tracking-[0.08em] text-text-3">
        <span className="text-text-2">{n}</span>
        <span aria-hidden className="h-px w-8 bg-line-2" />
        <span>{label}</span>
      </p>
      <div className="mt-5 grid gap-x-10 gap-y-4 lg:grid-cols-12 lg:items-end">
        <h2 id={id} className="text-title font-medium text-text lg:col-span-7">
          {title}
        </h2>
        {lede ? <p className="max-w-[34rem] text-lede text-text-2 lg:col-span-5 lg:pb-1">{lede}</p> : null}
      </div>
    </header>
  );
}
