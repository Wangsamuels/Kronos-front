"use client";
import { useEffect, useSyncExternalStore } from "react";
import { api, apiUrl, unwrap } from "./client";
import { ensureToken, refresh } from "./auth";
import { mockReady } from "./mockReady";
import type { RunEvent } from "./types";

/**
 * Live analysis log over native EventSource: GET /v1/analyses/:id/stream?token=…&lastEventId=…
 *
 * Every event carries a numeric `id`. The backend replays events with id > lastId, where lastId is
 * the Last-Event-ID header (sent by the browser only on its own automatic reconnects) or the
 * `lastEventId` query param. A brand-new EventSource cannot set that header, so when we close the
 * stream (analysis finished, run rests in `review`) and open it again after POST /approve, we pass
 * `?lastEventId=<last id we hold>`. The server then sends only what happened after it: the approval
 * stage line and every packaging event, ending with `done` (stage "package").
 *
 * Events are kept per run id in memory and in sessionStorage, so navigating Review → Analysis (or a
 * reload) resumes from the same id instead of replaying from zero.
 */

export const EVENT_TYPES = ["stage", "log", "entrypoint", "invariant", "done", "error"] as const;
const RESTING = new Set(["review", "failed", "packaged"]);

export type StreamStatus = "idle" | "connecting" | "open" | "resting" | "done" | "error" | "unreachable";

export interface StreamState {
  runId: string;
  events: RunEvent[];
  lastEventId: number;
  status: StreamStatus;
  /** The id the current connection resumed from (0 = full replay). Shown in the log header. */
  resumedFrom: number;
  connectionError?: string;
}

interface Store {
  state: StreamState;
  listeners: Set<() => void>;
  es: EventSource | null;
  attempts: number;
  gen: number;
}

const stores = new Map<string, Store>();
const storageKey = (runId: string) => `kronos.stream.${runId}`;

function hydrate(runId: string): StreamState {
  const base: StreamState = { runId, events: [], lastEventId: 0, status: "idle", resumedFrom: 0 };
  if (typeof window === "undefined") return base;
  try {
    const raw = sessionStorage.getItem(storageKey(runId));
    if (!raw) return base;
    const saved = JSON.parse(raw) as { events: RunEvent[]; lastEventId: number };
    return { ...base, events: saved.events ?? [], lastEventId: saved.lastEventId ?? 0 };
  } catch {
    return base;
  }
}

function getStore(runId: string): Store {
  let s = stores.get(runId);
  if (!s) {
    s = { state: hydrate(runId), listeners: new Set(), es: null, attempts: 0, gen: 0 };
    stores.set(runId, s);
  }
  return s;
}

function update(s: Store, patch: Partial<StreamState>) {
  s.state = { ...s.state, ...patch };
  if (patch.events || patch.lastEventId !== undefined) {
    try {
      sessionStorage.setItem(
        storageKey(s.state.runId),
        JSON.stringify({ events: s.state.events.slice(-2000), lastEventId: s.state.lastEventId }),
      );
    } catch {}
  }
  s.listeners.forEach((l) => l());
}

/** The id to resume from. Kept from the original analysis run. */
export function lastEventIdFor(runId: string) {
  return getStore(runId).state.lastEventId;
}

export function closeStream(runId: string) {
  const s = stores.get(runId);
  if (s) s.gen++;
  if (s?.es) {
    s.es.close();
    s.es = null;
  }
}

/**
 * Open (or reopen) the stream. With resume=true (default) it continues from the last event id we
 * hold; pass resume=false to clear the local log and replay from the start.
 */
export async function openStream(runId: string, opts: { resume?: boolean } = {}) {
  const s = getStore(runId);
  closeStream(runId);
  const gen = s.gen;
  if (opts.resume === false) update(s, { events: [], lastEventId: 0 });
  const from = s.state.lastEventId;
  update(s, { status: "connecting", resumedFrom: from, connectionError: undefined });

  await mockReady;
  const token = await ensureToken();
  if (s.gen !== gen) return; // superseded by a newer open/close
  const url = new URL(apiUrl(`/v1/analyses/${runId}/stream`), window.location.origin);
  if (token) url.searchParams.set("token", token);
  if (from > 0) url.searchParams.set("lastEventId", String(from));

  const es = new EventSource(url.toString());
  s.es = es;

  es.onopen = () => {
    s.attempts = 0;
    update(s, { status: "open" });
  };

  const onEvent = (e: MessageEvent<string>) => {
    if (s.es !== es) return es.close();
    let ev: RunEvent;
    try {
      ev = JSON.parse(e.data) as RunEvent;
    } catch {
      return;
    }
    if (typeof ev.id !== "number") ev.id = Number(e.lastEventId) || s.state.lastEventId + 1;
    if (ev.id <= s.state.lastEventId) return; // replay overlap
    const events = [...s.state.events, ev];
    const terminal = ev.type === "done" || ev.type === "error";
    update(s, { events, lastEventId: ev.id, status: terminal ? (ev.type === "done" ? "done" : "error") : "open" });
    if (terminal) {
      // Close deliberately: otherwise EventSource would auto-reconnect to a resting run.
      es.close();
      if (s.es === es) s.es = null;
    }
  };
  for (const t of EVENT_TYPES) es.addEventListener(t, onEvent as EventListener);

  es.onerror = async () => {
    if (s.es !== es) return;
    // Server ended the response. Is the run resting (nothing more will come) or still working?
    let runStatus: string | undefined;
    try {
      runStatus = (await unwrap(api.GET("/v1/analyses/{id}", { params: { path: { id: runId } } }))).status;
    } catch {}
    if (s.es !== es) return;
    if (runStatus && RESTING.has(runStatus)) {
      es.close();
      s.es = null;
      update(s, { status: "resting" });
      return;
    }
    if (es.readyState === EventSource.CLOSED) {
      // Fatal (e.g. 401 on an expired ?token=). Refresh and reopen from the last id we hold.
      s.es = null;
      if (s.attempts++ < 4) {
        await refresh();
        setTimeout(() => void openStream(runId), 1500 * s.attempts);
      } else {
        update(s, { status: "unreachable", connectionError: "Lost the live log connection" });
      }
    }
    // readyState CONNECTING: the browser reconnects by itself and sends Last-Event-ID.
  };
}

const emptyState = (runId: string): StreamState => ({ runId, events: [], lastEventId: 0, status: "idle", resumedFrom: 0 });

export function useAnalysisStream(runId: string | null | undefined, opts: { autoOpen?: boolean } = {}) {
  const autoOpen = opts.autoOpen ?? true;
  const state = useSyncExternalStore(
    (fn) => {
      if (!runId) return () => {};
      const s = getStore(runId);
      s.listeners.add(fn);
      return () => s.listeners.delete(fn);
    },
    () => (runId ? getStore(runId).state : SERVER_EMPTY),
    () => SERVER_EMPTY,
  );
  useEffect(() => {
    if (!runId || !autoOpen) return;
    const s = getStore(runId);
    const last = s.state.events[s.state.events.length - 1];
    // Already finished packaging, nothing to follow.
    if (!(last?.type === "done" && last.stage === "package") && !s.es) void openStream(runId);
    return () => closeStream(runId);
  }, [runId, autoOpen]);
  return state.runId === runId ? state : runId ? emptyState(runId) : SERVER_EMPTY;
}
const SERVER_EMPTY: StreamState = emptyState("");
