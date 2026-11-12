"use client";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { api, unwrap } from "./client";
import { getToken, onAuthChange, ensureToken } from "./auth";
import { ApiError } from "./errors";
import type { CreateProtocolBody, Settings, WalletAuthBody } from "./types";

export const qk = {
  meta: ["meta"] as const,
  me: ["me"] as const,
  protocols: ["protocols"] as const,
  protocol: (id: string) => ["protocol", id] as const,
  run: (id: string) => ["run", id] as const,
  results: (id: string) => ["results", id] as const,
  runPackage: (id: string) => ["runPackage", id] as const,
  pkg: (id: string) => ["package", id] as const,
  deployments: (id: string) => ["deployments", id] as const,
  overview: (id: string) => ["overview", id] as const,
  events: (id: string, kind?: string) => ["events", id, kind ?? "all"] as const,
  adminQueue: (id: string) => ["adminQueue", id] as const,
  settings: (id: string) => ["settings", id] as const,
};

/** Re-renders on sign-in/out; kicks a silent refresh on first use. */
export function useSession() {
  const token = useSyncExternalStore(onAuthChange, getToken, () => null);
  useEffect(() => {
    void ensureToken();
  }, []);
  return { token, signedIn: token !== null };
}

export const useMeta = () =>
  useQuery({ queryKey: qk.meta, queryFn: () => unwrap(api.GET("/v1/meta")), staleTime: 5 * 60_000 });

/** Sign-in options and the exact values wallets must sign. */
export const useProviders = () =>
  useQuery({ queryKey: ["providers"] as const, queryFn: () => unwrap(api.GET("/v1/auth/providers")), staleTime: 5 * 60_000 });

export function useMe() {
  const { token } = useSession();
  return useQuery({
    queryKey: [...qk.me, token],
    queryFn: () => unwrap(api.GET("/v1/me")),
    enabled: token !== null,
    retry: false,
  });
}

export const useProtocols = () =>
  useQuery({ queryKey: qk.protocols, queryFn: () => unwrap(api.GET("/v1/protocols", { params: { query: { limit: 100 } } })) });

export const useProtocol = (id: string, opts?: { poll?: number }) =>
  useQuery({
    queryKey: qk.protocol(id),
    queryFn: () => unwrap(api.GET("/v1/protocols/{id}", { params: { path: { id } } })),
    enabled: !!id,
    refetchInterval: opts?.poll,
  });

export const useRun = (runId: string | null | undefined, poll?: number) =>
  useQuery({
    queryKey: qk.run(runId ?? ""),
    queryFn: () => unwrap(api.GET("/v1/analyses/{id}", { params: { path: { id: runId! } } })),
    enabled: !!runId,
    refetchInterval: poll,
  });

export const useResults = (runId: string | null | undefined) =>
  useQuery({
    queryKey: qk.results(runId ?? ""),
    queryFn: () => unwrap(api.GET("/v1/analyses/{id}/results", { params: { path: { id: runId! } } })),
    enabled: !!runId,
  });

/** 404 while the package is still building: keep polling until it exists. */
export const useRunPackage = (runId: string | null | undefined) =>
  useQuery({
    queryKey: qk.runPackage(runId ?? ""),
    queryFn: () => unwrap(api.GET("/v1/analyses/{id}/package", { params: { path: { id: runId! } } })),
    enabled: !!runId,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
    refetchInterval: (q) => (q.state.error instanceof ApiError && q.state.error.status === 404 ? 3000 : false),
  });

export const useDeployments = (id: string) =>
  useQuery({
    queryKey: qk.deployments(id),
    queryFn: () => unwrap(api.GET("/v1/protocols/{id}/deployments", { params: { path: { id } } })),
  });

export const useOverview = (id: string) =>
  useQuery({
    queryKey: qk.overview(id),
    queryFn: () => unwrap(api.GET("/v1/protocols/{id}/overview", { params: { path: { id } } })),
    // No event stream for the dashboard: poll every 15s. React Query pauses this while the tab is hidden.
    refetchInterval: 15_000,
  });

export const useEvents = (id: string, kind?: string) =>
  useQuery({
    queryKey: qk.events(id, kind),
    queryFn: () =>
      unwrap(api.GET("/v1/protocols/{id}/events", { params: { path: { id }, query: { limit: 100, ...(kind ? { kind } : {}) } } })),
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });

export const useAdminQueue = (id: string) =>
  useQuery({
    queryKey: qk.adminQueue(id),
    queryFn: () => unwrap(api.GET("/v1/protocols/{id}/admin-queue", { params: { path: { id }, query: { status: "queued" } } })),
    refetchInterval: 15_000,
  });

export const useSettings = (id: string) =>
  useQuery({
    queryKey: qk.settings(id),
    queryFn: () => unwrap(api.GET("/v1/protocols/{id}/settings", { params: { path: { id } } })),
  });

// ---------- mutations

export function useDevLogin() {
  return useMutation({
    mutationFn: (login?: string) => unwrap(api.POST("/v1/auth/dev", { body: { login: login ?? "demo" } })),
  });
}

export function useWalletAuth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: WalletAuthBody) => unwrap(api.POST("/v1/auth/wallet", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me }),
  });
}

export function useCreateProtocol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProtocolBody) => unwrap(api.POST("/v1/protocols", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.protocols }),
  });
}

export function useReanalyze(protocolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/v1/protocols/{id}/analyses", { params: { path: { id: protocolId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.protocol(protocolId) }),
  });
}

export function useWaitlist() {
  return useMutation({
    mutationFn: (body: { email: string; protocolType: string }) => unwrap(api.POST("/v1/waitlist", { body })),
  });
}

export function usePatchInvariant(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status?: "proposed" | "approved" | "rejected"; params?: Record<string, unknown> }) =>
      unwrap(api.PATCH("/v1/invariants/{id}", { params: { path: { id: v.id } }, body: { status: v.status, params: v.params } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.results(runId) }),
  });
}

export function usePatchIntent(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status?: "proposed" | "approved" | "rejected"; bounds?: Record<string, unknown> }) =>
      unwrap(api.PATCH("/v1/intent-schemas/{id}", { params: { path: { id: v.id } }, body: { status: v.status, bounds: v.bounds } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.results(runId) }),
  });
}

export function usePatchTier(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status?: "proposed" | "approved" | "rejected"; tier?: number }) =>
      unwrap(api.PATCH("/v1/tiers/{id}", { params: { path: { id: v.id } }, body: { status: v.status, tier: v.tier } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.results(runId) }),
  });
}

export function useApprove(runId: string, protocolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/v1/analyses/{id}/approve", { params: { path: { id: runId } } })),
    onSuccess: (run) => {
      qc.setQueryData(qk.run(runId), run);
      void qc.invalidateQueries({ queryKey: qk.protocol(protocolId) });
    },
  });
}

export function useOpenPr(packageId: string | undefined, runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/v1/packages/{id}/pull-request", { params: { path: { id: packageId! } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.runPackage(runId) }),
  });
}

export function useVerifyDeployment(protocolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { chainId: number; guardAddress: string; timelockAddress?: string; registryAddress?: string }) =>
      unwrap(api.POST("/v1/protocols/{id}/deployments", { params: { path: { id: protocolId } }, body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.deployments(protocolId) });
      void qc.invalidateQueries({ queryKey: qk.protocol(protocolId) });
      void qc.invalidateQueries({ queryKey: qk.protocols });
    },
  });
}

export function usePatchSettings(protocolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Settings) =>
      unwrap(api.PATCH("/v1/protocols/{id}/settings", { params: { path: { id: protocolId } }, body })),
    onSuccess: (data) => qc.setQueryData(qk.settings(protocolId), data),
  });
}
