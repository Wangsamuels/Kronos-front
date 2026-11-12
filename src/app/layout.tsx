import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { mono, sans } from "@/lib/fonts";
import { Providers } from "./providers";
import { MockBadge } from "@/components/MockBadge";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kronos — a security layer for lending protocols, built on NEAR", template: "%s · Kronos" },
  description:
    "AI in a trusted enclave on NEAR AI Cloud writes the guard. Aurora enforces it cheaply. A NEAR key that can only tighten handles emergencies on every chain. Testnet today; lending first.",
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
