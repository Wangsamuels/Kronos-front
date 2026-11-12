"use client";
import * as D from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Wordmark } from "./Wordmark";
import { ButtonLink } from "./ui/Button";
import { GITHUB_URL } from "@/lib/links";
import { ArrowRight, ArrowUpRight, Cross } from "./ui/Icons";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#the-guard", label: "The guard" },
  { href: "/#coverage", label: "Coverage" },
  { href: "/docs", label: "Docs" },
  { href: GITHUB_URL, label: "GitHub", external: GITHUB_URL.startsWith("http") },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("sticky top-0 z-30 border-b bg-bg/85 backdrop-blur-md transition-colors duration-k", scrolled ? "border-line" : "border-transparent")}>
      <nav aria-label="Main" className="mx-auto flex h-16 w-full max-w-grid items-center gap-10 px-5 md:px-10 lg:px-14">
        <Wordmark />
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex h-9 items-center gap-1 rounded-ctl px-3 text-13 text-text-2 transition-colors duration-k hover:bg-surface-2 hover:text-text"
                {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {l.label}
                {l.external ? <ArrowUpRight className="size-3 text-text-3" /> : null}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/p" className="hidden h-9 lg:inline-flex items-center rounded-ctl px-3 text-13 text-text-2 transition-colors duration-k hover:bg-surface-2 hover:text-text">
            Your protocols
          </Link>
          <ButtonLink href="/connect" size="sm">
            Protect a protocol
            <ArrowRight className="size-3.5" />
          </ButtonLink>
        </div>
        <D.Root>
          <D.Trigger aria-label="Open menu" className="ml-auto grid size-11 place-items-center rounded-ctl border border-line text-text-2 md:ml-0 lg:hidden">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M3 6h12M3 12h12" />
            </svg>
          </D.Trigger>
          <D.Portal>
            <D.Overlay className="fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm lg:hidden" />
            <D.Content className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg px-5 pb-6 md:px-10 lg:hidden">
              <div className="flex h-16 items-center justify-between">
                <D.Title asChild>
                  <span>
                    <Wordmark />
                  </span>
                </D.Title>
                <D.Close aria-label="Close menu" className="grid size-11 place-items-center rounded-ctl border border-line text-text-2">
                  <Cross />
                </D.Close>
              </div>
              <D.Description className="sr-only">Site navigation</D.Description>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {[...LINKS, { href: "/p", label: "Your protocols" }].map((l, i) => (
                  <li key={l.href}>
                    <D.Close asChild>
                      <Link href={l.href} className="flex h-14 items-center justify-between text-17 text-text">
                        {l.label}
                        <span className="font-mono text-11 text-text-3">0{i + 1}</span>
                      </Link>
                    </D.Close>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/connect" size="lg" className="mt-6 w-full">
                Protect a protocol
                <ArrowRight />
              </ButtonLink>
            </D.Content>
          </D.Portal>
        </D.Root>
      </nav>
    </header>
  );
}

/** Compact top bar for app screens (onboarding, dashboard): wordmark + breadcrumb. */
export function AppBar({ crumbs, right }: { crumbs?: { href?: string; label: string }[]; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="k-container flex h-14 items-center gap-4">
        <Wordmark />
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="min-w-0 truncate text-13 text-text-2">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 ? <span className="px-1.5 text-text-3">/</span> : null}
                {c.href ? (
                  <Link href={c.href} className="hover:text-text">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-text">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
