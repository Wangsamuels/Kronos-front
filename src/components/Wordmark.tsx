import Link from "next/link";

/** The mark is the wordmark's slash, boxed: a gate with one way through. */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 font-mono text-15 font-medium tracking-tight text-text" aria-label="Kronos home">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0">
        <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="4.25" stroke="rgb(var(--line-2))" strokeWidth="1.5" />
        <path d="M7.5 14.5l5-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <span>
        kro<span className="text-text-3 transition-colors duration-k group-hover:text-pass">/</span>nos
      </span>
    </Link>
  );
}
