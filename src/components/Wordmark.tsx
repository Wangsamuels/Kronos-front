import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-mono text-15 font-medium tracking-tight text-text" aria-label="Kronos home">
      kro<span className="text-text-3">/</span>nos
    </Link>
  );
}
