/** Public runtime configuration. Everything here is inlined at build time by Next. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
/** Empty NEXT_PUBLIC_API_URL means: run against the MSW mock API in the browser. */
export const USE_MOCKS = API_URL === "";
export const WALLETCONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "";
export const NEAR_NETWORK = (process.env.NEXT_PUBLIC_NEAR_NETWORK ?? "testnet") as "testnet" | "mainnet";
export const CHAIN_KEYS = (process.env.NEXT_PUBLIC_CHAINS ?? "aurora-testnet,base-sepolia")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
