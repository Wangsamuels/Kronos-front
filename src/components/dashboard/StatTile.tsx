import { cn } from "@/lib/cn";
import { Counter } from "@/components/Counter";

/** Label, value, 24h sparkline. */
export function StatTile({ label, value, format, unit, tone, series, foot }: { label: string; value: number; format?: (n: number) => string; unit?: string; tone?: "block" | "queue" | "pass"; series?: number[]; foot?: React.ReactNode }) {
  return (
    <div className="k-panel flex flex-col p-5">
      <p className="k-label">{label}</p>
      <p className={cn("mt-3 text-32", tone === "block" ? "text-block" : tone === "queue" ? "text-queue" : tone === "pass" ? "text-pass" : "text-text")} aria-live="polite">
        <Counter value={value} format={format} />
        {unit ? <span className="ml-2 font-mono text-15 text-text-2">{unit}</span> : null}
      </p>
      <div className="mt-auto pt-4">{series ? <Sparkline data={series} tone={tone} /> : foot}</div>
    </div>
  );
}

export function Sparkline({ data, tone }: { data: number[]; tone?: "block" | "queue" | "pass" }) {
  const w = 200;
  const h = 32;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  const color = tone ? `rgb(var(--${tone}))` : "rgb(var(--text-3))";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full" role="img" aria-label={`24h trend, peak ${max}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
