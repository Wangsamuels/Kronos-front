"use client";
import * as D from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Wordmark } from "./Wordmark";
import { ButtonLink } from "./ui/Button";
import { GITHUB_URL } from "@/lib/links";
import { ArrowRight, ArrowUpRight, Cross } from "./ui/Icons";
import { AuthLink } from "./auth/AuthLink";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#the-guard", label: "The guard" },
  { href: "/why-near", label: "Why NEAR" },
  { href: "/docs", label: "Docs" },
  { href: GITHUB_URL, label: "GitHub", external: GITHUB_URL.startsWith("http") },
];

/** Home-page sections the nav tracks while scrolling. */
const SECTIONS = LINKS.filter((l) => l.href.startsWith("/#")).map((l) => l.href.slice(2));

/** Which nav link matches where the user is: the section in view on the home page, or the current route. */
function useActiveHref() {
  const pathname = usePathname();
  const [section, setSection] = useState<string | null>(null);
  useEffect(() => {
    if (pathname !== "/") {
      setSection(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = 96; // just under the sticky nav
      let hit: string | null = null;
      for (const id of SECTIONS) {
        const r = document.getElementById(id)?.getBoundingClientRect();
        if (r && r.top <= line && r.bottom > line) hit = id;
      }
      setSection(hit);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);
  if (pathname === "/") return section ? `/#${section}` : null;
  return LINKS.find((l) => !l.external && !l.href.startsWith("/#") && (pathname === l.href || pathname.startsWith(`${l.href}/`)))?.href ?? null;
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeHref = useActiveHref();
  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 4);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return (
    <header className={cn("sticky top-0 z-30 border-b bg-bg/85 backdrop-blur-md transition-colors duration-k", scrolled ? "border-line" : "border-transparent")}>
      <nav aria-label="Main" className="mx-auto flex h-16 w-full max-w-grid items-center gap-10 px-5 md:px-10 lg:px-14">
        <Wordmark />
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const on = activeHref === l.href;
            return (
              <li key={l.href} className="relative">
                {on ? (
                  <motion.span
                    layoutId="nav-active"
                    aria-hidden
                    className="absolute inset-0 rounded-ctl bg-surface-2"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                ) : null}
                <Link
                  href={l.href}
                  aria-current={on ? "location" : undefined}
                  className={cn(
                    "relative inline-flex h-9 items-center gap-1 rounded-ctl px-3 text-13 transition-colors duration-k hover:text-text",
                    on ? "text-text" : "text-text-2 hover:bg-surface-2",
                  )}
                  {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {l.label}
                  {l.external ? <ArrowUpRight className="size-3 text-text-3" /> : null}
                </Link>
                {on ? (
                  <motion.span
                    layoutId="nav-underline"
                    aria-hidden
                    className="absolute inset-x-3 -bottom-[13px] h-px bg-text"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <AuthLink href="/p" className="hidden h-9 items-center rounded-ctl px-3 text-13 text-text-2 transition-colors duration-k hover:bg-surface-2 hover:text-text lg:inline-flex">
            Your protocols
          </AuthLink>
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
                {LINKS.map((l, i) => (
                  <li key={l.href}>
                    <D.Close asChild>
                      <Link href={l.href} className="flex h-14 items-center justify-between text-17 text-text">
                        {l.label}
                        <span className="font-mono text-11 text-text-3">0{i + 1}</span>
                      </Link>
                    </D.Close>
                  </li>
                ))}
                <li>
                  <D.Close asChild>
                    <AuthLink href="/p" className="flex h-14 items-center justify-between text-17 text-text">
                      Your protocols
                      <span className="font-mono text-11 text-text-3">0{LINKS.length + 1}</span>
                    </AuthLink>
                  </D.Close>
                </li>
              </ul>
              <ButtonLink href="/connect" size="lg" className="mt-6 w-full">
                Protect a protocol
                <ArrowRight />
              </ButtonLink>
            </D.Content>
          </D.Portal>
        </D.Root>
      </nav>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px">
        <div className="h-full bg-text/60" style={{ width: `${progress * 100}%` }} />
      </div>
    </header>
  );
}

/** Compact top bar for app screens (onboarding, dashboard): wordmark + breadcrumb. */
export function AppBar({ crumbs, right }: { crumbs?: { href?: string; label: string }[]; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="k-container flex h-16 items-center gap-4">
        <Wordmark />
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center border-l border-line pl-4 text-13 text-text-2">
            <ol className="flex min-w-0 items-center">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={i} className={cn("flex min-w-0 items-center", !last && "hidden min-[520px]:flex")}>
                    {i > 0 ? <span aria-hidden className="hidden px-2 font-mono text-text-3 min-[520px]:inline">/</span> : null}
                    {c.href ? (
                      <Link href={c.href} className="whitespace-nowrap rounded-ctl transition-colors duration-k hover:text-text">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current={last ? "page" : undefined} className="truncate text-text">
                        {c.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
