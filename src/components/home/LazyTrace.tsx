"use client";
import dynamic from "next/dynamic";

/** The hero console is lazy-loaded so it never competes with the headline for LCP. */
export const LazyTrace = dynamic(() => import("@/components/TraceRail").then((m) => m.TraceRail), {
  ssr: false,
  loading: () => (
    <div className="h-[452px] rounded-panel border border-line-2 bg-surface sm:h-[440px]" aria-hidden>
      <div className="h-11 border-b border-line" />
      <div className="p-5">
        <div className="h-4 w-40 rounded-ctl bg-surface-2" />
        <div className="mt-7 h-2 w-full rounded-ctl bg-surface-2" />
        <div className="mt-9 h-[104px] w-full rounded-ctl bg-surface-2" />
      </div>
    </div>
  ),
});
