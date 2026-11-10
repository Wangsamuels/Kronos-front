"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <main id="main" className="k-container py-20">
      <p className="font-mono text-13 text-block">error</p>
      <h1 className="mt-3 text-32 font-medium">This screen failed to render.</h1>
      <p className="mt-2 font-mono text-13 text-text-2">{error.message}</p>
      <Button variant="secondary" className="mt-6" onClick={reset}>
        Retry
      </Button>
    </main>
  );
}
