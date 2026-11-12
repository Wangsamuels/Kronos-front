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
import { Check, GitHubMark, Wallet } from "@/components/ui/Icons";

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
    <div className="overflow-hidden rounded-panel border border-line-2 bg-surface">
      <Row
        icon={<GitHubMark />}
        title="GitHub"
        note="required"
        done={ghDone && appDone}
        doneText={u?.githubLogin ? `@${u.githubLogin}${appDone ? " · app installed" : ""}` : undefined}
        help="The GitHub App reads the repo for analysis and opens the integration pull request. Nothing else."
      >
        {!signedIn || !ghDone ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={github} busy={dev.isPending}>
              <GitHubMark />
              Continue with GitHub
            </Button>
            {meta.data?.devLogin && !USE_MOCKS ? (
              <Button variant="ghost" onClick={() => devLogin()}>
                Dev login
              </Button>
            ) : null}
          </div>
        ) : !appDone ? (
          <Button onClick={installApp}>
            <GitHubMark />
            Install the Kronos GitHub App on this repo
          </Button>
        ) : null}
      </Row>
      <Row
        icon={<Wallet />}
        title="Prove you control the protocol"
        note="recommended"
        done={walletDone}
        doneText={u?.walletAddress ? short(u.walletAddress) : u?.nearAccount ?? undefined}
        help="A signature only (SIWE or NEP-413). It never moves funds, and you can add it any time before going live."
        dim={!signedIn}
      >
        {!walletDone ? (
          <div className="flex flex-wrap gap-2">
            {connectors.map((c) => (
              <Button key={c.id} variant="secondary" disabled={!signedIn} busy={walletBusy === c.id} onClick={() => signEvm(c.id)}>
                EVM · {c.name}
              </Button>
            ))}
            <Button variant="secondary" disabled={!signedIn} busy={walletBusy === "meteor-wallet"} onClick={() => signNear("meteor-wallet")}>
              NEAR · Meteor
            </Button>
            <Button variant="secondary" disabled={!signedIn} busy={walletBusy === "my-near-wallet"} onClick={() => signNear("my-near-wallet")}>
              NEAR · MyNearWallet
            </Button>
          </div>
        ) : null}
      </Row>
      {signedIn ? (
        <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-5 py-2.5 text-13 text-text-3">
          <span>Signed in{u?.githubLogin ? ` as @${u.githubLogin}` : ""}</span>
          <button className="rounded-ctl px-1 text-text-2 underline decoration-line-2 underline-offset-4 transition-colors duration-k hover:text-text" onClick={() => void logout().then(() => qc.clear())}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Row({ icon, title, note, done, doneText, help, dim, children }: { icon: React.ReactNode; title: string; note: string; done: boolean; doneText?: string; help: string; dim?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-b border-line p-5 last:border-b-0">
      <span className={cn("grid size-9 place-items-center rounded-ctl border", done ? "border-pass/30 bg-pass/10 text-pass" : "border-line-2 bg-surface-2 text-text-2")}>{done ? <Check /> : icon}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className={cn("text-17 font-medium", dim && !done ? "text-text-2" : "text-text")}>{title}</p>
          {done ? <span className="truncate font-mono text-13 text-pass">{doneText ?? "done"}</span> : <span className="font-mono text-11 uppercase tracking-[0.06em] text-text-3">{note}</span>}
        </div>
        <p className="mt-1 text-13 text-text-3">{help}</p>
        {children ? <div className="mt-4 empty:hidden">{children}</div> : null}
      </div>
    </div>
  );
}
