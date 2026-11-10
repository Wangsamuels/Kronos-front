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
