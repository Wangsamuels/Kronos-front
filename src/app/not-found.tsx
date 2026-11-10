import { AppBar } from "@/components/SiteNav";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <AppBar />
      <main id="main" className="k-container py-20">
        <p className="font-mono text-13 text-block">404 · reverted</p>
        <h1 className="mt-3 text-32 font-medium">No route matches this path.</h1>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          Home
        </ButtonLink>
      </main>
    </div>
  );
}
