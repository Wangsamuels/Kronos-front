import { short } from "./format";

/**
 * Tokens the UI can show in whole units. The API sends amounts as strings in the token's smallest
 * unit; anything not listed here is shown raw, labelled as base units, rather than guessed.
 */
const TOKENS: Record<string, { symbol: string; decimals: number }> = {
  // MiniLend demo deployment (same addresses on Aurora testnet and Base Sepolia)
  "0x8326f1ef7456ed27ff6d7ba6635231f873cf1a8e": { symbol: "kUSDC", decimals: 6 },
  "0x2355bd309f5435abda697d1e2c737422a28a988b": { symbol: "kWETH", decimals: 18 },
  "0xdcceccd2955211ae82ab9a21a496d3da6320c7e2": { symbol: "THIN", decimals: 18 },
  // MiniLend demo after the Chain Signatures redeploy
  "0x3afa5f034aa297a019c61f03bb62cde0d5a9fbeb": { symbol: "kUSDC", decimals: 6 },
  // Base Sepolia
  "0x036cbd53842c5426634e7929541ec2318f3dcf7e": { symbol: "USDC", decimals: 6 },
  "0x4200000000000000000000000000000000000006": { symbol: "WETH", decimals: 18 },
};

export function tokenInfo(asset: string | null | undefined) {
  return asset ? TOKENS[asset.toLowerCase()] : undefined;
}

export function tokenSymbol(asset: string | null | undefined, fallback?: string) {
  return tokenInfo(asset)?.symbol ?? fallback ?? (asset && /^0x[0-9a-fA-F]{40}$/.test(asset) ? short(asset) : asset ?? "");
}

/** "250000000000" with 6 decimals -> "250000". Exact (BigInt), trailing zeros trimmed. */
export function fromUnits(raw: string | null | undefined, decimals: number): string {
  if (raw == null || raw === "" || !/^\d+$/.test(raw)) return raw ?? "";
  if (decimals === 0) return raw;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** "250000.5" with 6 decimals -> "250000500000". Returns null when the text is not a number. */
export function toUnits(text: string, decimals: number): string | null {
  const t = text.trim().replace(/,/g, "");
  if (!/^\d*\.?\d*$/.test(t) || t === "" || t === ".") return null;
  const [whole = "", frac = ""] = t.split(".");
  if (frac.length > decimals) return null;
  return (BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt((frac || "").padEnd(decimals, "0") || "0")).toString();
}

/** Amount for display: whole units with the symbol when the token is known, raw base units otherwise. */
export function formatAmount(raw: string | null | undefined, asset?: string | null): string {
  if (raw == null || raw === "") return "—";
  const info = tokenInfo(asset);
  if (!info || !/^\d+$/.test(raw)) {
    const n = Number(raw);
    const v = Number.isFinite(n) ? n.toLocaleString("en-US") : raw;
    // Unknown token: the number is in the token's smallest unit, so say so rather than imply whole tokens.
    return asset ? `${v} base units of ${tokenSymbol(asset)}` : v;
  }
  const n = Number(fromUnits(raw, info.decimals));
  return `${n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : 4 })} ${info.symbol}`;
}

/** Number (whole units) for charts and totals. Unknown tokens are returned as-is. */
export function amountNumber(raw: string | null | undefined, asset?: string | null): number {
  if (!raw) return 0;
  const info = tokenInfo(asset);
  const n = Number(info && /^\d+$/.test(raw) ? fromUnits(raw, info.decimals) : raw);
  return Number.isFinite(n) ? n : 0;
}
