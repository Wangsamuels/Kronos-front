/** Public runtime configuration. Everything here is inlined at build time by Next. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
/** Empty NEXT_PUBLIC_API_URL means: run against the MSW mock API in the browser. */
export const USE_MOCKS = API_URL === "";
/**
 * Base for the live log (SSE). The stream goes straight to the backend when a direct URL is set,
 * because a proxy can buffer or cut long-lived responses; otherwise it uses the same base as the API.
 */
export const API_DIRECT_URL = USE_MOCKS ? "" : (process.env.NEXT_PUBLIC_API_DIRECT_URL ?? "").replace(/\/+$/, "") || API_URL;
/** Dev login is a backend test facility: never shown in a production build that talks to a real API. */
export const SHOW_DEV_LOGIN = USE_MOCKS || process.env.NODE_ENV !== "production";
export const WALLETCONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "";
export const NEAR_NETWORK = (process.env.NEXT_PUBLIC_NEAR_NETWORK ?? "testnet") as "testnet" | "mainnet";
export const CHAIN_KEYS = (process.env.NEXT_PUBLIC_CHAINS ?? "aurora-testnet,base-sepolia")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
