import type { NextConfig } from "next";

const BACKEND = (process.env.KRONOS_API_ORIGIN || "https://kronos-9fbcca7bfc9b.herokuapp.com").replace(/\/+$/, "");
/**
 * Production builds (`next build`, Vercel) talk to the live backend unless told otherwise; `next dev`
 * stays on the mock API. An env var always wins, including an empty one:
 * `NEXT_PUBLIC_API_URL= pnpm build` builds on mocks.
 */
const live = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // Same-origin proxy (see rewrites below), so the refresh cookie is first-party.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? (live ? "/api" : ""),
    // The live log (SSE) goes straight to the backend: a proxy can buffer or cut long-lived streams.
    NEXT_PUBLIC_API_DIRECT_URL: process.env.NEXT_PUBLIC_API_DIRECT_URL ?? (live ? BACKEND : ""),
  },
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: { optimizePackageImports: ["framer-motion", "viem"] },
  /**
   * Same-origin API: the browser calls /api/v1/..., this proxies it to the backend, so the refresh
   * cookie is first-party (Safari and Brave block third-party cookies). vercel.json carries the same
   * rewrite for Vercel's edge; this one covers `next dev` and `next start`.
   */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/:path*` }];
  },
  webpack: (config, { isServer }) => {
    // The MSW browser worker never runs on the server.
    if (isServer) config.resolve.alias = { ...(config.resolve.alias ?? {}), "msw/browser": false };
    // WalletConnect / pino optional deps that are not needed in the browser bundle.
    config.externals = [...(config.externals ?? []), "pino-pretty", "lokijs", "encoding"];
    return config;
  },
};

export default nextConfig;
