"use client";
import { API_URL } from "@/lib/env";
import { mockReady } from "./mockReady";
import type { Session } from "./types";

/**
 * Access JWT lives in memory only. The long-lived refresh token is the backend's httpOnly
 * cookie, so a silent refresh is just POST /v1/auth/refresh with credentials: 'include'.
 */
let accessToken: string | null = null;
let expiresAt = 0;
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

export function getToken() {
  return accessToken;
}

export function setSession(token: string | null, expiresInSeconds = 900) {
  accessToken = token;
  expiresAt = token ? Date.now() + expiresInSeconds * 1000 : 0;
  listeners.forEach((l) => l());
}

export function onAuthChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isSignedIn() {
  return accessToken !== null;
}

/** Silent refresh, de-duplicated across concurrent callers. Never throws. */
export function refresh(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    await mockReady;
    try {
      const res = await fetch(`${API_URL}/v1/auth/refresh`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        setSession(null);
        return null;
      }
      const s = (await res.json()) as Session;
      setSession(s.accessToken, s.expiresIn);
      return s.accessToken;
    } catch {
      return null;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

let bootTried = false;
/** A valid token, refreshing if it is missing or about to expire. */
export async function ensureToken(): Promise<string | null> {
  if (accessToken && Date.now() < expiresAt - 30_000) return accessToken;
  if (!accessToken && bootTried && !refreshing) {
    // Already know there is no session; don't hammer /refresh on every request.
    return null;
  }
  bootTried = true;
  return refresh();
}

export async function logout() {
  await mockReady;
  try {
    await fetch(`${API_URL}/v1/auth/logout`, { method: "POST", credentials: "include" });
  } finally {
    setSession(null);
  }
}

/** Where to return after GitHub OAuth (the backend redirects to /auth/callback). */
export function rememberReturnTo(path: string) {
  try {
    sessionStorage.setItem("kronos.returnTo", path);
  } catch {}
}
export function takeReturnTo() {
  try {
    const v = sessionStorage.getItem("kronos.returnTo");
    sessionStorage.removeItem("kronos.returnTo");
    return v;
  } catch {
    return null;
  }
}
