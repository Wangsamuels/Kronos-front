"use client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { normalizeUrl, repoError, websiteError } from "@/lib/validate";
import { Button } from "./ui/Button";
import { ArrowRight, GitHubMark } from "./ui/Icons";

export interface RepoValue {
  website: string;
  repo: string;
}

/**
 * Website + repo fields with inline URL validation and paste detection. In "launch" mode (hero,
 * footer) submitting opens /connect with the values; in "controlled" mode (/connect) the parent owns
 * the values and the submit.
 */
export function RepoInput({
  value,
  onChange,
  onSubmit,
  submitLabel = "Analyze protocol",
  hint,
  className,
  busy,
  hideSubmit,
  variant = "stacked",
}: {
  value?: RepoValue;
  onChange?: (v: RepoValue) => void;
  onSubmit?: (v: RepoValue) => void;
  submitLabel?: string;
  hint?: React.ReactNode;
  className?: string;
  busy?: boolean;
  hideSubmit?: boolean;
  /** "inline": one repo field with the submit button inside it (hero, closing CTA). The website is asked on /connect. */
  variant?: "stacked" | "inline";
}) {
  const router = useRouter();
  const [local, setLocal] = useState<RepoValue>({ website: "", repo: "" });
  const v = value ?? local;
  const set = (patch: Partial<RepoValue>) => {
    const next = { ...v, ...patch };
    if (onChange) onChange(next);
    else setLocal(next);
  };
  const [touched, setTouched] = useState({ website: false, repo: false });
  const [pasted, setPasted] = useState<string | null>(null);
  const wErr = touched.website ? websiteError(v.website) : null;
  const rErr = touched.repo ? repoError(v.repo) : null;
  const id = useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ website: true, repo: true });
    if (websiteError(v.website) || repoError(v.repo)) return;
    const clean = { website: v.website ? normalizeUrl(v.website) : "", repo: normalizeUrl(v.repo) };
    if (onSubmit) return onSubmit(clean);
    const q = new URLSearchParams();
    if (clean.website) q.set("website", clean.website);
    q.set("repo", clean.repo);
    router.push(`/connect?${q.toString()}`);
  };

  /** Paste detection: a GitHub URL pasted in the website field moves to the repo field. */
  const onPaste = (field: keyof RepoValue) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").trim();
    if (field === "website" && /github\.com\//i.test(text)) {
      e.preventDefault();
      set({ repo: text });
      setTouched((t) => ({ ...t, repo: true }));
      setPasted("GitHub link detected: moved to the repo field");
      return;
    }
    setPasted(null);
    setTimeout(() => setTouched((t) => ({ ...t, [field]: true })), 0);
  };

  if (variant === "inline") {
    return (
      <form onSubmit={submit} noValidate className={cn("w-full", className)}>
        <div
          className={cn(
            "flex flex-col gap-2 rounded-panel border bg-surface p-2 transition-colors duration-k focus-within:border-text-3 min-[480px]:flex-row min-[480px]:items-center",
            rErr ? "border-block" : "border-line-2",
          )}
        >
          <label htmlFor={`${id}-r`} className="sr-only">
            GitHub repo URL
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-3">
            <GitHubMark className="shrink-0 text-text-3" />
            <input
              id={`${id}-r`}
              className="h-12 w-full min-w-0 bg-transparent font-mono text-[14px] text-text outline-none placeholder:text-text-3"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="github.com/org/repo"
              value={v.repo}
              onChange={(e) => set({ repo: e.target.value })}
              onBlur={() => v.repo && setTouched((t) => ({ ...t, repo: true }))}
              aria-invalid={!!rErr}
              aria-describedby={rErr ? `${id}-r-err` : undefined}
              required
            />
          </div>
          <Button type="submit" size="lg" busy={busy} className="shrink-0">
            {submitLabel}
            <ArrowRight />
          </Button>
        </div>
        <div className="mt-3 min-h-5 text-13">
          {rErr ? (
            <p id={`${id}-r-err`} role="alert" className="font-mono text-block">
              {rErr}
            </p>
          ) : hint ? (
            <div className="text-text-3">{hint}</div>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", className)}>
      <div className="grid gap-2">
        <Field id={`${id}-w`} label="Website" optional error={wErr}>
          <input
            id={`${id}-w`}
            className="k-input h-12 border-0 bg-transparent pl-24 focus-visible:shadow-none"
            inputMode="url"
            autoComplete="url"
            placeholder="https://minilend.xyz"
            value={v.website}
            onChange={(e) => set({ website: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, website: true }))}
            onPaste={onPaste("website")}
            aria-invalid={!!wErr}
            aria-describedby={wErr ? `${id}-w-err` : undefined}
          />
        </Field>
        <Field id={`${id}-r`} label="Repo" error={rErr}>
          <input
            id={`${id}-r`}
            className="k-input h-12 border-0 bg-transparent pl-24 focus-visible:shadow-none"
            inputMode="url"
            placeholder="github.com/minilend/protocol"
            value={v.repo}
            onChange={(e) => set({ repo: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, repo: true }))}
            onPaste={onPaste("repo")}
            aria-invalid={!!rErr}
            aria-describedby={rErr ? `${id}-r-err` : undefined}
            required
          />
        </Field>
      </div>
      <p className="mt-2 min-h-5 font-mono text-11 text-text-3" aria-live="polite">
        {pasted ?? "\u00a0"}
      </p>
      {!hideSubmit ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button type="submit" busy={busy}>
            {submitLabel}
          </Button>
          {hint ? <span className="text-13 text-text-3">{hint}</span> : null}
        </div>
      ) : null}
    </form>
  );
}

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error: string | null; children: React.ReactNode }) {
  return (
    <div>
      <div className={cn("relative rounded-ctl border bg-surface-2 transition-colors duration-k focus-within:border-text-2 focus-within:shadow-[0_0_0_3px_rgb(var(--text)/0.1)]", error ? "border-block" : "border-line-2")}>
        <label htmlFor={id} className="k-label pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {label}
          {optional ? <span className="sr-only"> (optional)</span> : null}
        </label>
        {children}
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-1 font-mono text-11 text-block">
          {error}
        </p>
      ) : null}
    </div>
  );
}
