import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { GITHUB_URL, X_URL } from "@/lib/links";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="k-container flex flex-wrap items-center gap-x-8 gap-y-3 py-8 text-13 text-text-3">
        <Wordmark />
        <span>Built on NEAR</span>
        <span className="font-mono">lending · live MVP</span>
        <nav aria-label="Footer" className="ml-auto flex gap-6">
          <Link href={GITHUB_URL} className="hover:text-text">GitHub</Link>
          <Link href="/docs" className="hover:text-text">Docs</Link>
          <Link href={X_URL} className="hover:text-text">X</Link>
        </nav>
      </div>
    </footer>
  );
}
