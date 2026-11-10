"use client";
import { USE_MOCKS } from "@/lib/env";

/** Makes it obvious when the app is running on the scripted mock API. */
export function MockBadge() {
  if (!USE_MOCKS) return null;
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-40 rounded-ctl border border-line bg-surface px-2 py-1 font-mono text-11 text-text-3">
      mock api · NEXT_PUBLIC_API_URL empty
    </div>
  );
}
