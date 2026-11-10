import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { mono, sans } from "@/lib/fonts";
import { Providers } from "./providers";
import { MockBadge } from "@/components/MockBadge";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kronos — a guard for DeFi protocols", template: "%s · Kronos" },
  description:
    "Kronos maps every entry point in your protocol, writes the invariants, attacks them on a fork, and hands you a guard you merge in one PR. Lending ships first; bridges next.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = { themeColor: "#0B0C0E", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-text focus:px-3 focus:py-2 focus:text-bg">
          Skip to content
        </a>
        <Providers>
          {children}
          <MockBadge />
        </Providers>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
