"use client";
import dynamic from "next/dynamic";

/** The hero trace is lazy-loaded so it never competes with the headline for LCP. */
export const LazyTrace = dynamic(() => import("@/components/TraceRail").then((m) => m.TraceRail), {
  ssr: false,
  loading: () => (
    <div className="k-panel h-[292px] p-5" aria-hidden>
      <div className="h-3 w-24 rounded-ctl bg-surface-2" />
      <div className="mt-8 h-2 w-full rounded-ctl bg-surface-2" />
      <div className="mt-8 h-16 w-full rounded-ctl bg-surface-2" />
    </div>
  ),
});
