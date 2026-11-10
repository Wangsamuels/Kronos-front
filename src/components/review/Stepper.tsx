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
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-13 text-text-3">{name}</span>
      <div className={cn("flex h-9 items-center rounded-ctl border border-line bg-surface-2", disabled && "opacity-50")}>
        <button type="button" className="h-full w-9 font-mono text-text-2 hover:text-text disabled:cursor-not-allowed" aria-label={`Decrease ${name}`} disabled={disabled || value - step < 0} onClick={() => onChange(Math.max(0, value - step))}>
          −
        </button>
        <input
          aria-label={name}
          className="k-tnum h-full w-20 border-x border-line bg-transparent text-center font-mono text-13 text-text"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^\d]/g, ""));
            if (Number.isFinite(n)) onChange(n);
          }}
        />
        <button type="button" className="h-full w-9 font-mono text-text-2 hover:text-text disabled:cursor-not-allowed" aria-label={`Increase ${name}`} disabled={disabled} onClick={() => onChange(value + step)}>
          +
        </button>
      </div>
      <span className="k-tnum font-mono text-13 text-text">{formatParam(name, value)}</span>
    </div>
  );
}
