import type { ProtocolEvent } from "@/api/types";

/** 24 hourly buckets (oldest → newest) of events matching `pred`, optionally weighted. */
export function hourly(events: ProtocolEvent[], pred: (e: ProtocolEvent) => boolean, weight: (e: ProtocolEvent) => number = () => 1) {
  const now = Date.now();
  const buckets = Array<number>(24).fill(0);
  for (const e of events) {
    if (!pred(e)) continue;
    const ago = Math.floor((now - new Date(e.ts).getTime()) / 3600_000);
    if (ago >= 0 && ago < 24) buckets[23 - ago]! += weight(e);
  }
  return buckets;
}
