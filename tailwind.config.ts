import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    screens: { sm: "360px", md: "768px", lg: "1024px", xl: "1440px" },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      bg: v("bg"),
      surface: v("surface"),
      "surface-2": v("surface-2"),
      line: v("line"),
      text: v("text"),
      "text-2": v("text-2"),
      "text-3": v("text-3"),
      pass: v("pass"),
      block: v("block"),
      queue: v("queue"),
    },
    fontFamily: {
      sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
    },
    fontSize: {
      "64": ["64px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
      "44": ["44px", { lineHeight: "1.06", letterSpacing: "-0.02em" }],
      "32": ["32px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      "22": ["22px", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
      "17": ["17px", { lineHeight: "1.5" }],
      "15": ["15px", { lineHeight: "1.5" }],
      "13": ["13px", { lineHeight: "1.5" }],
      "11": ["11px", { lineHeight: "1.4", letterSpacing: "0.06em" }],
    },
    borderRadius: { none: "0", ctl: "6px", panel: "10px", full: "9999px" },
    extend: {
      maxWidth: { grid: "1240px" },
      transitionTimingFunction: { k: "cubic-bezier(.2,.8,.2,1)" },
      transitionDuration: { k: "180ms" },
    },
  },
  plugins: [],
} satisfies Config;
