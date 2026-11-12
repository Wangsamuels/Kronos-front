import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-sans font-medium transition-[background-color,border-color,color,transform] duration-k ease-k active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";
const variants: Record<Variant, string> = {
  primary: "bg-text text-bg shadow-[inset_0_-1px_0_rgb(0_0_0/0.18)] hover:bg-text/90 [&_svg]:transition-transform [&_svg]:duration-k hover:[&_svg]:translate-x-0.5",
  secondary: "border border-line-2 bg-transparent text-text hover:border-text-3 hover:bg-surface-2",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
  danger: "border border-block/60 text-block hover:bg-block/10",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-13",
  md: "h-11 px-4 text-15",
  lg: "h-12 px-5 text-15",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; busy?: boolean }>(
  function Button({ variant = "primary", size = "md", className, busy, children, disabled, ...rest }, ref) {
    return (
      <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
        {children}
        {busy ? <span className="font-mono text-11 opacity-70">…</span> : null}
      </button>
    );
  },
);

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
