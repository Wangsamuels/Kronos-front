"use client";
import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Mono number with tick-up animation and tabular numerals. */
export function Counter({ value, className, format = (n: number) => n.toLocaleString("en-US") }: { value: number; className?: string; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      prev.current = value;
      return;
    }
    const c = animate(prev.current, value, { duration: 0.22, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => setShown(Math.round(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value, reduce]);
  return <span className={cn("k-tnum font-mono", className)}>{format(shown)}</span>;
}
