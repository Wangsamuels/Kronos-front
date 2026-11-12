"use client";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <main id="main" className="k-container py-24 md:py-32">
      <span className="k-tag k-tag-block">error</span>
      <h1 className="mt-6 max-w-[18ch] text-title font-medium text-text">This screen failed to render.</h1>
      <p className="mt-4 max-w-[40rem] break-words font-mono text-13 text-text-2">{error.message}</p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </main>
  );
}
