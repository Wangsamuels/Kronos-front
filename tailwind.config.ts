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
      "line-2": v("line-2"),
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
      display: ["clamp(2.5rem, 5.2vw + 0.9rem, 5rem)", { lineHeight: "0.98", letterSpacing: "-0.04em" }],
      title: ["clamp(1.75rem, 2vw + 1.1rem, 2.875rem)", { lineHeight: "1.06", letterSpacing: "-0.03em" }],
      lede: ["clamp(1.0625rem, 0.35vw + 1rem, 1.1875rem)", { lineHeight: "1.55" }],
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
      keyframes: {
        "k-pulse": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        "k-ping": { "0%": { transform: "scale(1)", opacity: "0.55" }, "100%": { transform: "scale(2.6)", opacity: "0" } },
        "k-fill": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
        "k-row-in": { from: { opacity: "0", transform: "translateY(-6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "k-pulse": "k-pulse 2.4s ease-in-out infinite",
        "k-ping": "k-ping 2.2s cubic-bezier(0,0,.2,1) infinite",
        "k-row-in": "k-row-in 220ms cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
