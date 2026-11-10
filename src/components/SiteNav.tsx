"use client";
import * as D from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Wordmark } from "./Wordmark";
import { ButtonLink } from "./ui/Button";
import { GITHUB_URL } from "@/lib/links";

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
    <header className={cn("sticky top-0 z-30 border-b bg-bg transition-colors duration-k", scrolled ? "border-line" : "border-transparent")}>
      <nav aria-label="Main" className="k-container flex h-14 items-center gap-8">
        <Wordmark />
        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-13 text-text-2 hover:text-text" {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link href="/p" className="px-2 text-13 text-text-2 hover:text-text">
            Your protocols
          </Link>
          <ButtonLink href="/connect" size="sm">
            Protect a protocol
          </ButtonLink>
        </div>
        <D.Root>
          <D.Trigger className="ml-auto h-11 rounded-ctl border border-line px-3 font-mono text-13 text-text-2 md:hidden">menu</D.Trigger>
          <D.Portal>
            <D.Overlay className="fixed inset-0 z-40 bg-bg/80 md:hidden" />
            <D.Content className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg p-5 md:hidden">
              <div className="flex items-center justify-between">
                <D.Title asChild>
                  <span>
                    <Wordmark />
                  </span>
                </D.Title>
                <D.Close className="h-11 rounded-ctl border border-line px-3 font-mono text-13 text-text-2">close</D.Close>
              </div>
              <D.Description className="sr-only">Site navigation</D.Description>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {[...LINKS, { href: "/p", label: "Your protocols" }].map((l) => (
                  <li key={l.href}>
                    <D.Close asChild>
                      <Link href={l.href} className="flex h-12 items-center text-17 text-text">
                        {l.label}
                      </Link>
                    </D.Close>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/connect" className="mt-6 w-full">
                Protect a protocol
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
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
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
