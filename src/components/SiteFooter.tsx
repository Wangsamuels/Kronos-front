import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { ATTACK_TESTS_URL, GITHUB_URL, X_URL } from "@/lib/links";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#the-guard", label: "The guard" },
      { href: "/#coverage", label: "Coverage" },
    ],
  },
  {
    title: "Build",
    links: [
      { href: "/docs", label: "Docs" },
      { href: ATTACK_TESTS_URL, label: "Attack library" },
      { href: GITHUB_URL, label: "GitHub" },
    ],
  },
  {
    title: "App",
    links: [
      { href: "/connect", label: "Protect a protocol" },
      { href: "/p", label: "Your protocols" },
      { href: X_URL, label: "X" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-grid px-5 md:px-10 lg:px-14">
        <div className="grid gap-10 py-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <Wordmark />
            <p className="mt-4 max-w-xs text-15 text-text-2">An on-chain guard for DeFi protocols. Every action answers to your invariants, in the same transaction.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 min-[520px]:grid-cols-3 md:col-span-7">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="k-label">{c.title}</p>
                <ul className="mt-4 grid gap-1">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="inline-flex min-h-9 items-center text-15 text-text-2 transition-colors duration-k hover:text-text">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-line py-6 font-mono text-11 uppercase tracking-[0.06em] text-text-3">
          <span>© 2026 Kronos · Built on NEAR</span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="block size-1.5 rounded-full bg-pass" />
            Lending · live MVP on testnet
          </span>
        </div>
      </div>
    </footer>
  );
}
