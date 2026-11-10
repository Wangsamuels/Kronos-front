import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  experimental: { optimizePackageImports: ["framer-motion", "viem"] },
  webpack: (config, { isServer }) => {
    // The MSW browser worker never runs on the server.
    if (isServer) config.resolve.alias = { ...(config.resolve.alias ?? {}), "msw/browser": false };
    // WalletConnect / pino optional deps that are not needed in the browser bundle.
    config.externals = [...(config.externals ?? []), "pino-pretty", "lokijs", "encoding"];
    return config;
  },
};

export default nextConfig;
