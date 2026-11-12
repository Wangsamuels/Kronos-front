"use client";
import type { CreateProtocolBody } from "./types";

/**
 * One sign-in modal for the whole app. Anything can ask for it (the homepage Analyze button, the
 * "Your protocols" link, an API call that still gets 401 after one refresh); the modal itself is
 * mounted once in Providers and reads this store.
 */
export interface SignInRequest {
  /** Relative path to land on after signing in. */
  returnTo?: string;
  /** Why the modal opened, for its supporting line. */
  reason?: "submit" | "protocols" | "expired" | "link";
}

let current: SignInRequest | null = null;
const listeners = new Set<() => void>();

export function openSignIn(req: SignInRequest = {}) {
  if (typeof window === "undefined") return;
  current = { ...req, returnTo: safeReturnTo(req.returnTo) ?? window.location.pathname + window.location.search };
  listeners.forEach((l) => l());
}
export function closeSignIn() {
  if (!current) return;
  current = null;
  listeners.forEach((l) => l());
}
export function getSignInRequest() {
  return current;
}
export function onSignInChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Only same-site relative paths: "/p", never "//evil.example" or a full URL. */
export function safeReturnTo(path: string | null | undefined): string | undefined {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return undefined;
  return path;
}

// ---------- the form the reader filled in before being asked to sign in

const PENDING_KEY = "kronos:pending-submit";

export function savePendingSubmit(body: CreateProtocolBody) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(body));
  } catch {}
}
export function peekPendingSubmit(): CreateProtocolBody | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as CreateProtocolBody) : null;
  } catch {
    return null;
  }
}
export function clearPendingSubmit() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
}
