import { cn } from "@/lib/cn";

/** Page header shared by every app screen: mono eyebrow, one large title, a supporting line, actions on the right. */
export function PageHead({ eyebrow, title, lede, right, className }: { eyebrow?: React.ReactNode; title: React.ReactNode; lede?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-10 gap-y-6", className)}>
      <div className="min-w-0 max-w-[46rem]">
        {eyebrow ? <div className="mb-4">{eyebrow}</div> : null}
        <h1 className="text-[clamp(1.75rem,1.5vw+1.25rem,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-text">{title}</h1>
        {lede ? <p className="mt-3 max-w-[40rem] text-lede text-text-2">{lede}</p> : null}
      </div>
      {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
    </header>
  );
}

/** "02 —— Step 2 of 5 · Analyze": the onboarding eyebrow, in the same form as the homepage section labels. */
export function StepEyebrow({ n, label, note }: { n: number; label: string; note?: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-11 uppercase tracking-[0.08em] text-text-3">
      <span className="text-text-2">0{n}</span>
      <span aria-hidden className="h-px w-8 bg-line-2" />
      <span>
        Step {n} of 5 · {label}
        {note ? ` · ${note}` : ""}
      </span>
    </p>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-11 uppercase tracking-[0.08em] text-text-3">
      <span aria-hidden className="h-px w-8 bg-line-2" />
      <span>{children}</span>
    </p>
  );
}

/** Label + control + hint or error. The error replaces the hint so the row never changes height twice. */
export function Field({ label, hint, error, optional, htmlFor, children, className }: { label: string; hint?: React.ReactNode; error?: string | null; optional?: boolean; htmlFor?: string; children: React.ReactNode; className?: string }) {
  const Tag = htmlFor ? "div" : "label";
  return (
    <Tag className={cn("grid gap-2", className)}>
      <span className="flex items-baseline justify-between gap-3">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-13 font-medium text-text">
            {label}
          </label>
        ) : (
          <span className="text-13 font-medium text-text">{label}</span>
        )}
        {optional ? <span className="font-mono text-11 text-text-3">optional</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="font-mono text-11 text-block">
          {error}
        </span>
      ) : hint ? (
        <span className="text-13 text-text-3">{hint}</span>
      ) : null}
    </Tag>
  );
}

/** A numbered block of a long form or a multi-part screen. */
export function FormSection({ n, title, hint, children, className }: { n: string; title: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("grid gap-5 border-t border-line pt-8 first:border-t-0 first:pt-0 md:grid-cols-[3rem_1fr] md:gap-x-6", className)}>
      <span aria-hidden className="hidden pt-1 font-mono text-13 text-text-3 md:block">
        {n}
      </span>
      <div className="min-w-0">
        <h2 className="text-22 font-medium text-text">{title}</h2>
        {hint ? <p className="mt-1.5 max-w-[38rem] text-15 text-text-2">{hint}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

/** Inline notice with a status word. Neutral surface; only the word carries colour. */
export function Notice({ tone = "queue", word, children, className, role }: { tone?: "queue" | "block" | "pass" | "idle"; word: string; children: React.ReactNode; className?: string; role?: "alert" | "status" }) {
  return (
    <div role={role} className={cn("flex flex-wrap items-start gap-x-3 gap-y-2 rounded-panel border border-line-2 bg-surface px-4 py-3.5 text-15 text-text-2", className)}>
      <span className={cn("k-tag shrink-0", `k-tag-${tone}`)}>{word}</span>
      <div className="min-w-0 flex-1 pt-px">{children}</div>
    </div>
  );
}
