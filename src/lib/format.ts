export function short(hex: string | null | undefined, head = 6, tail = 4) {
  if (!hex) return "—";
  return hex.length <= head + tail + 1 ? hex : `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export function clockTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export function dateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { hour12: false, dateStyle: "medium", timeStyle: "short" });
}

export function duration(seconds: number) {
  if (seconds <= 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d) return `${d}d ${h}h ${String(m).padStart(2, "0")}m`;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export const TIER_DELAYS = [0, 48 * 3600, 7 * 86400, 14 * 86400] as const;
export const TIER_LABEL = ["Tier 0 · instant", "Tier 1 · 48 hours", "Tier 2 · 7 days", "Tier 3 · 14 days + co-sign"] as const;
export const TIER_SHORT = ["instant", "48h", "7 days", "14 days"] as const;

export function tierDelay(tier: number) {
  return TIER_DELAYS[tier] ?? 0;
}

const nf = new Intl.NumberFormat("en-US");
export function num(n: number | null | undefined) {
  return n == null || Number.isNaN(n) ? "—" : nf.format(n);
}

/** Amounts come from the API as decimal strings in token units (or raw integers). */
export function amount(a: string | null | undefined, asset?: string | null) {
  if (a == null || a === "") return "—";
  const n = Number(a);
  const v = Number.isFinite(n) ? nf.format(n) : a;
  return asset ? `${v} ${assetLabel(asset)}` : v;
}

export function assetLabel(asset: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(asset) ? short(asset) : asset;
}

export function sinceSeconds(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}
