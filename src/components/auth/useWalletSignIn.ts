"use client";
import { useCallback, useEffect, useState } from "react";
import { api, unwrap } from "@/api/client";
import { setSession } from "@/api/auth";
import { errorMessage } from "@/api/errors";
import type { Providers, Session, WalletAuthBody } from "@/api/types";
import { useToast } from "@/components/ui/Toast";

/**
 * EVM (SIWE) and NEAR (NEP-413) sign-in. The same call links a wallet to the signed-in account: the
 * API client attaches the bearer token, and the backend then links instead of creating a new account.
 */
export function useWalletSignIn(providers: Providers | undefined, onDone: (s: Session) => void | Promise<void>) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void import("@/lib/wallet/evm").then((m) => setConnectors(m.availableConnectors())).catch(() => {});
  }, []);

  const finish = useCallback(
    async (body: WalletAuthBody) => {
      const s = await unwrap(api.POST("/v1/auth/wallet", { body }));
      setSession(s.accessToken, s.expiresIn);
      await onDone(s);
    },
    [onDone],
  );

  const evm = async (connectorId: string, chainId?: number) => {
    if (!providers?.siwe.enabled) return;
    setBusy(connectorId);
    try {
      const { nonce } = await unwrap(api.GET("/v1/auth/nonce"));
      const m = await import("@/lib/wallet/evm");
      await finish(await m.signSiwe(nonce, providers.siwe, chainId, connectorId));
    } catch (e) {
      toast({ title: "Wallet sign-in failed", body: errorMessage(e), tone: "block" });
    } finally {
      setBusy(null);
    }
  };

  const near = async (id: "meteor-wallet" | "my-near-wallet") => {
    if (!providers?.near.enabled) return;
    setBusy(id);
    try {
      const { nonce } = await unwrap(api.GET("/v1/auth/nonce"));
      const m = await import("@/lib/wallet/near");
      const r = await m.signNear(id, nonce, providers.near);
      // null = redirect wallet: the signature comes back in the URL hash and is picked up on load.
      if (r) await finish(r);
    } catch (e) {
      toast({ title: "NEAR sign-in failed", body: errorMessage(e), tone: "block" });
    } finally {
      setBusy(null);
    }
  };

  return { busy, connectors, evm, near, finish };
}
