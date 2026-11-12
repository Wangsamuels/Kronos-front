import { AppBar } from "@/components/SiteNav";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <AppBar />
      <main id="main" className="k-container relative isolate py-24 md:py-32">
        <div aria-hidden className="k-grid-bg pointer-events-none absolute inset-0 -z-10" />
        <span className="k-tag k-tag-block">404 · reverted</span>
        <h1 className="mt-6 max-w-[16ch] text-display font-medium text-text">No route matches this path.</h1>
        <p className="mt-5 max-w-[32rem] text-lede text-text-2">The link may be old, or the protocol belongs to another account.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <ButtonLink href="/">
            Back to home
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/p" variant="secondary">
            Your protocols
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
