"use client";
import createClient from "openapi-fetch";
import { API_URL } from "@/lib/env";
import type { paths } from "./schema";
import { ensureToken, getToken, refresh } from "./auth";
import { mockReady } from "./mockReady";
import { toApiError } from "./errors";

/** fetch with bearer auth, one silent refresh + retry on 401, and the MSW start-up gate. */
async function authFetch(input: Request): Promise<Response> {
  await mockReady;
  const retry = input.clone();
  const token = await ensureToken();
  if (token) input.headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(input);
  if (res.status !== 401 || input.url.includes("/v1/auth/")) return res;
  const next = await refresh();
  if (!next) return res;
  retry.headers.set("authorization", `Bearer ${next}`);
  return fetch(retry);
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

export function withToken(url: string) {
  const t = getToken();
  if (!t) return url;
  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(t)}`;
}
