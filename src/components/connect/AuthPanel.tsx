"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, apiUrl, unwrap } from "@/api/client";
import { rememberReturnTo, setSession, logout } from "@/api/auth";
import { errorMessage } from "@/api/errors";
import { qk, useDevLogin, useMe, useMeta, useSession, useWalletAuth } from "@/api/queries";
import { USE_MOCKS } from "@/lib/env";
import { short } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

/**
 * Auth, asked only here and only when needed: GitHub (OAuth + App install on the repo, needed for
 * analysis and the PR), then a wallet signature proving the team controls the protocol.
 */
export function AuthPanel({ chainId }: { chainId: number }) {
  const { signedIn } = useSession();
  const me = useMe();
  const meta = useMeta();
  const dev = useDevLogin();
  const wallet = useWalletAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [walletBusy, setWalletBusy] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void import("@/lib/wallet/evm").then((m) => setConnectors(m.availableConnectors())).catch(() => {});
    // MyNearWallet returns here with the signature in the hash.
    void import("@/lib/wallet/near").then(async (m) => {
      const r = m.takeNearRedirect();
      if (r) await linkWallet(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const devLogin = async (login?: string) => {
    try {
      const s = await dev.mutateAsync(login);
      setSession(s.accessToken, s.expiresIn);
      await qc.invalidateQueries({ queryKey: qk.me });
    } catch (e) {
      toast({ title: "Sign-in failed", body: errorMessage(e), tone: "block" });
    }
  };

  const github = () => {
    if (USE_MOCKS) return void devLogin("demo");
    rememberReturnTo(window.location.pathname + window.location.search);
    window.location.href = apiUrl("/v1/auth/github");
  };
  const installApp = () => {
    rememberReturnTo(window.location.pathname + window.location.search);
    window.location.href = apiUrl("/v1/auth/github/install");
  };

  async function linkWallet(body: Parameters<typeof wallet.mutateAsync>[0]) {
    const s = await wallet.mutateAsync(body);
    setSession(s.accessToken, s.expiresIn);
    toast({ title: "wallet linked", body: body.type === "near" ? body.accountId : "EVM signature verified", tone: "pass" });
  }

  const signEvm = async (connectorId: string) => {
    setWalletBusy(connectorId);
    try {
      const { nonce } = await unwrap(api.GET("/v1/auth/nonce"));
      if (USE_MOCKS && connectors.length === 0) throw new Error("No browser wallet detected");
      const m = await import("@/lib/wallet/evm");
      await linkWallet(await m.signSiwe(nonce, chainId, connectorId));
    } catch (e) {
      toast({ title: "Wallet signature failed", body: errorMessage(e), tone: "block" });
    } finally {
      setWalletBusy(null);
    }
  };
  const signNear = async (id: "meteor-wallet" | "my-near-wallet") => {
    setWalletBusy(id);
    try {
      const { nonce } = await unwrap(api.GET("/v1/auth/nonce"));
      const m = await import("@/lib/wallet/near");
      const r = await m.signNear(id, nonce);
      if (r) await linkWallet(r);
    } catch (e) {
      toast({ title: "NEAR signature failed", body: errorMessage(e), tone: "block" });
    } finally {
      setWalletBusy(null);
    }
  };

  const u = me.data;
  const ghDone = !!u?.githubLogin;
  const appDone = !!u?.githubAppInstalled;
  const walletDone = !!(u?.walletAddress || u?.nearAccount);

  return (
    <div className="k-panel divide-y divide-line">
      <Row n="a" title="GitHub" done={ghDone && appDone} doneText={u?.githubLogin ? `@${u.githubLogin}${appDone ? " · app installed" : ""}` : undefined}>
        {!signedIn || !ghDone ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={github} busy={dev.isPending} variant="secondary">
              Continue with GitHub
            </Button>
            {meta.data?.devLogin && !USE_MOCKS ? (
              <Button variant="ghost" onClick={() => devLogin()}>
                Dev login
              </Button>
            ) : null}
          </div>
        ) : !appDone ? (
          <Button variant="secondary" onClick={installApp}>
            Install the Kronos GitHub App on this repo
          </Button>
        ) : null}
        <p className="mt-2 text-13 text-text-3">The GitHub App reads the repo for analysis and opens the integration PR. Nothing else.</p>
      </Row>
      <Row n="b" title="Prove you control the protocol" done={walletDone} doneText={u?.walletAddress ? short(u.walletAddress) : u?.nearAccount ?? undefined} optional>
        {!walletDone ? (
          <div className="flex flex-wrap gap-2">
            {connectors.map((c) => (
              <Button key={c.id} variant="secondary" size="sm" disabled={!signedIn} busy={walletBusy === c.id} onClick={() => signEvm(c.id)}>
                EVM · {c.name}
              </Button>
            ))}
            <Button variant="secondary" size="sm" disabled={!signedIn} busy={walletBusy === "meteor-wallet"} onClick={() => signNear("meteor-wallet")}>
              NEAR · Meteor
            </Button>
            <Button variant="secondary" size="sm" disabled={!signedIn} busy={walletBusy === "my-near-wallet"} onClick={() => signNear("my-near-wallet")}>
              NEAR · MyNearWallet
            </Button>
          </div>
        ) : null}
        <p className="mt-2 text-13 text-text-3">A signature only (SIWE or NEP-413). It never moves funds. You can add it before going live.</p>
      </Row>
      {signedIn ? (
        <div className="flex justify-end px-5 py-2">
          <button className="font-mono text-11 text-text-3 hover:text-text" onClick={() => void logout().then(() => qc.clear())}>
            sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Row({ n, title, done, doneText, optional, children }: { n: string; title: string; done: boolean; doneText?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-15 text-text">
          <span className="mr-2 font-mono text-13 text-text-3">{n}</span>
          {title}
          {optional ? <span className="ml-2 font-mono text-11 text-text-3">recommended</span> : null}
        </p>
        <span className={cn("font-mono text-13", done ? "text-pass" : "text-text-3")}>{done ? `✓ ${doneText ?? "done"}` : "not yet"}</span>
      </div>
      {children}
    </div>
  );
}
