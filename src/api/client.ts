"use client";
import createClient from "openapi-fetch";
import { API_DIRECT_URL, API_URL } from "@/lib/env";
import type { paths } from "./schema";
import { ensureToken, getToken, refresh } from "./auth";
import { mockReady } from "./mockReady";
import { toApiError } from "./errors";
import { getSignInRequest, openSignIn } from "./signin";

/** fetch with bearer auth, one silent refresh + retry on 401, and the MSW start-up gate. */
async function authFetch(input: Request): Promise<Response> {
  await mockReady;
  const retry = input.clone();
  const token = await ensureToken();
  if (token) input.headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(input);
  if (res.status !== 401 || input.url.includes("/v1/auth/")) return res;
  // One refresh, one retry. Still 401 after that means the session is gone: ask to sign in again.
  const next = await refresh();
  if (!next) {
    askToSignIn();
    return res;
  }
  retry.headers.set("authorization", `Bearer ${next}`);
  const again = await fetch(retry);
  if (again.status === 401) askToSignIn();
  return again;
}

function askToSignIn() {
  if (typeof window === "undefined" || getSignInRequest()) return;
  // The callback page handles its own failures.
  if (window.location.pathname.startsWith("/auth/")) return;
  openSignIn({ reason: "expired" });
}

export const api = createClient<paths>({
  baseUrl: API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost"),
  credentials: "include",
  fetch: authFetch,
});

/** Unwrap an openapi-fetch result, throwing ApiError on non-2xx. */
export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await p;
  if (!response.ok) throw toApiError(response.status, error);
  return data as T;
}

export function apiUrl(path: string) {
  return `${API_URL}${path}`;
}

/** URL for the live log: straight to the backend when a direct URL is configured. */
export function streamUrl(path: string) {
  return `${API_DIRECT_URL}${path}`;
}

export function withToken(url: string) {
  const t = getToken();
  if (!t) return url;
  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(t)}`;
}
