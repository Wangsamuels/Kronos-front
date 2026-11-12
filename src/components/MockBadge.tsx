"use client";
import { USE_MOCKS } from "@/lib/env";

/** Makes it obvious when the app is running on the scripted mock API. */
export function MockBadge() {
  if (!USE_MOCKS) return null;
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-40 flex h-6 items-center gap-2 rounded-full border border-line-2 bg-surface/90 px-2.5 font-mono text-[10px] uppercase tracking-[0.06em] text-text-3 backdrop-blur">
      <span aria-hidden className="block size-1.5 rounded-full bg-queue" />
      mock api
    </div>
  );
}
