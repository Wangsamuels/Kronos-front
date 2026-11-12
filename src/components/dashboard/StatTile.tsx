import { cn } from "@/lib/cn";
import { Counter } from "@/components/Counter";

/** Label, value, 24h sparkline. Tiles sit edge to edge inside one bordered strip. */
export function StatTile({ label, window, value, format, unit, tone, series, foot }: { label: string; window?: string; value: number; format?: (n: number) => string; unit?: string; tone?: "block" | "queue" | "pass"; series?: number[]; foot?: React.ReactNode }) {
  return (
    <div className="flex min-h-[172px] min-w-0 flex-col bg-surface p-4 md:p-5">
      <p className="flex items-center justify-between gap-3 text-13 text-text-2">
        {label}
        {window ? <span className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">{window}</span> : null}
      </p>
      <p className={cn("mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[26px] leading-none tracking-[-0.03em] md:text-[40px]", tone === "block" ? "text-block" : tone === "queue" ? "text-queue" : tone === "pass" ? "text-pass" : "text-text")} aria-live="polite">
        <Counter value={value} format={format} />
        {unit ? <span className="font-mono text-13 tracking-normal text-text-2">{unit}</span> : null}
      </p>
      <div className="mt-auto pt-5">{series ? <Sparkline data={series} tone={tone} /> : foot}</div>
    </div>
  );
}

export function Sparkline({ data, tone }: { data: number[]; tone?: "block" | "queue" | "pass" }) {
  const w = 200;
  const h = 36;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const xy = data.map((v, i) => [i * step, h - 2 - (v / max) * (h - 6)] as const);
  const pts = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const color = tone ? `rgb(var(--${tone}))` : "rgb(var(--text-3))";
  const fill = tone ? `rgb(var(--${tone}) / 0.1)` : "rgb(var(--text-3) / 0.1)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-9 w-full" role="img" aria-label={`24h trend, peak ${max}`}>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={fill} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={h - 0.5} x2={w} y2={h - 0.5} stroke="rgb(var(--line-2))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
