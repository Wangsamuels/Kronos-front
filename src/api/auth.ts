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
  bootTried = true;
  scheduleRefresh();
  listeners.forEach((l) => l());
}

/**
 * Access tokens live 15 minutes. Refresh about a minute before expiry while the tab is visible; a
 * hidden tab waits and refreshes the moment it is looked at again.
 */
let timer: ReturnType<typeof setTimeout> | null = null;
let watching = false;
function scheduleRefresh() {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = null;
  if (!accessToken) return;
  const due = Math.max(5_000, expiresAt - Date.now() - 60_000);
  timer = setTimeout(() => {
    if (document.visibilityState === "visible") void refresh();
  }, due);
  if (!watching) {
    watching = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && accessToken && Date.now() > expiresAt - 60_000) void refresh();
    });
  }
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
        // 401 here means signed out. That is normal, not an error.
        setSession(null);
        return null;
      }
      const s = (await res.json()) as Session;
      setSession(s.accessToken, s.expiresIn);
      return s.accessToken;
    } catch {
      bootTried = true;
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

/** True once the first refresh has answered, so "signed out" is known rather than assumed. */
export function sessionKnown() {
  return bootTried && !refreshing;
}

/**
 * GitHub callback: swap the one-time code (60 seconds, single use) for a session. Called through this
 * site's /api rewrite, so the refresh cookie lands on this domain.
 */
export async function exchangeCode(code: string): Promise<Session | null> {
  await mockReady;
  try {
    const res = await fetch(`${API_URL}/v1/auth/exchange`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return null;
    const s = (await res.json()) as Session;
    setSession(s.accessToken, s.expiresIn);
    return s;
  } catch {
    return null;
  }
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
