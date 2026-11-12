"use client";
import { cn } from "@/lib/cn";

export function stepFor(name: string, v: number) {
  if (/bps$/i.test(name)) return v >= 1000 ? 100 : v >= 100 ? 10 : 1;
  if (/seconds$/i.test(name)) return 60;
  return v >= 1000 ? 100 : 1;
}

export function formatParam(name: string, v: number) {
  if (/bps$/i.test(name)) return `${(v / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
  if (/seconds$/i.test(name)) return v >= 3600 ? `${v / 3600}h` : `${v / 60}m`;
  if (/days$/i.test(name)) return `${v}d`;
  return v.toLocaleString("en-US");
}

export function Stepper({ name, value, onChange, disabled }: { name: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const step = stepFor(name, value);
  const btn = "grid h-full w-9 place-items-center text-text-2 transition-colors duration-k hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:hover:bg-transparent";
  return (
    <div className="grid items-center gap-x-3 gap-y-1.5 min-[520px]:grid-cols-[1fr_auto]">
      <span className="min-w-0 truncate font-mono text-13 text-text-2" title={name}>
        {name}
      </span>
      <div className="flex items-center justify-between gap-3">
        <span className="k-tnum min-[520px]:w-14 min-[520px]:text-right font-mono text-13 text-text">{formatParam(name, value)}</span>
        <div className={cn("flex h-9 items-center overflow-hidden rounded-ctl border border-line-2 bg-surface-2 font-mono", disabled && "opacity-50")}>
          <button type="button" className={btn} aria-label={`Decrease ${name}`} disabled={disabled || value - step < 0} onClick={() => onChange(Math.max(0, value - step))}>
            −
          </button>
          <input
            aria-label={name}
            className="k-tnum h-full w-[4.5rem] border-x border-line-2 bg-transparent text-center text-13 text-text focus-visible:bg-surface focus-visible:outline-none"
            inputMode="numeric"
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^\d]/g, ""));
              if (Number.isFinite(n)) onChange(n);
            }}
          />
          <button type="button" className={btn} aria-label={`Increase ${name}`} disabled={disabled} onClick={() => onChange(value + step)}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
