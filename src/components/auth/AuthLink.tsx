"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { getToken, sessionKnown } from "@/api/auth";
import { openSignIn } from "@/api/signin";

/**
 * A link to a signed-in page. Signed out, it opens the sign-in modal with this page as returnTo
 * instead of navigating; signed in (or before the session is known), it is an ordinary link.
 */
export function AuthLink({ href, onClick, ...rest }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (!getToken() && sessionKnown()) {
          e.preventDefault();
          openSignIn({ returnTo: href, reason: "protocols" });
        }
      }}
      {...rest}
    />
  );
}
