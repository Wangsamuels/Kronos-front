"use client";
import * as D from "@radix-ui/react-dialog";
import { useEffect, useSyncExternalStore } from "react";
import { api, unwrap } from "@/api/client";
import { getToken, setSession } from "@/api/auth";
import { errorMessage } from "@/api/errors";
import { useProviders, useSession } from "@/api/queries";
import { closeSignIn, getSignInRequest, onSignInChange, peekPendingSubmit } from "@/api/signin";
import { SHOW_DEV_LOGIN, USE_MOCKS } from "@/lib/env";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Cross, GitHubMark, Wallet } from "@/components/ui/Icons";
import { Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useAfterSignIn } from "./useAfterSignIn";
import { useWalletSignIn } from "./useWalletSignIn";

/** GitHub start link: a full-page navigation to the backend, never a fetch. */
export function githubStartUrl(startUrl: string, returnTo: string, opts: { install?: boolean; link?: boolean } = {}) {
  const u = new URL(startUrl + (opts.install ? "/install" : ""));
  u.searchParams.set("returnTo", returnTo);
  const token = getToken();
  // linkToken attaches GitHub (or the App install) to the signed-in account instead of creating a second one.
  if ((opts.link || opts.install) && token) u.searchParams.set("linkToken", token);
  return u.toString();
}

const REASON: Record<string, string> = {
  submit: "Sign in to start the analysis. Your repo is kept, so you won’t have to paste it again.",
  protocols: "Sign in to see your protocols.",
  expired: "Your session ended. Sign in again to carry on where you were.",
};

/**
 * The one sign-in modal: sign-up and sign-in are the same step, and the backend says which happened.
 * Built from GET /v1/auth/providers; only enabled providers are shown.
 */
export function AuthModal() {
  const req = useSyncExternalStore(onSignInChange, getSignInRequest, () => null);
  const { signedIn } = useSession();
  const providers = useProviders();
  const after = useAfterSignIn();
  const toast = useToast();
  const returnTo = req?.returnTo ?? "/";
  const wallet = useWalletSignIn(providers.data, (s) => after({ isNewUser: s.isNewUser, returnTo }));

  // Redirect wallets (MyNearWallet) come back to the page they left with the signature in the hash.
  useEffect(() => {
    void import("@/lib/wallet/near").then(async (m) => {
      const r = m.takeNearRedirect();
      if (!r) return;
      try {
        await wallet.finish(r);
      } catch (e) {
        toast({ title: "NEAR sign-in failed", body: errorMessage(e), tone: "block" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signed in some other way while the modal was open (another tab, a silent refresh): get out of the way.
  useEffect(() => {
    if (signedIn && req && req.reason !== "link") closeSignIn();
  }, [signedIn, req]);

  const p = providers.data;
  const pending = !!req && !!peekPendingSubmit();

  const devLogin = async () => {
    try {
      const s = await unwrap(api.POST("/v1/auth/dev", { body: { login: "demo" } }));
      setSession(s.accessToken, s.expiresIn);
      await after({ isNewUser: s.isNewUser, returnTo });
    } catch (e) {
      toast({ title: "Sign-in failed", body: errorMessage(e), tone: "block" });
    }
  };
  const github = () => {
    // The mock API has no GitHub: the same button signs in the demo user.
    if (USE_MOCKS) return void devLogin();
    if (p) window.location.href = githubStartUrl(p.github.startUrl, returnTo);
  };

  const group = "mt-3 font-mono text-11 uppercase tracking-[0.08em] text-text-3 first:mt-0";
  const option = "flex min-h-[3.25rem] w-full items-center gap-3 rounded-ctl border border-line-2 px-4 text-left text-15 text-text transition-colors duration-k hover:border-text-3 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <D.Root open={!!req} onOpenChange={(o) => !o && closeSignIn()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm" />
        <D.Content
          aria-describedby="signin-desc"
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-panel border border-line-2 bg-surface p-5 shadow-[0_32px_96px_-24px_rgb(0_0_0/0.9)] focus:outline-none min-[520px]:inset-x-auto min-[520px]:bottom-auto min-[520px]:left-1/2 min-[520px]:top-1/2 min-[520px]:w-[440px] min-[520px]:-translate-x-1/2 min-[520px]:-translate-y-1/2 min-[520px]:rounded-panel min-[520px]:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-11 uppercase tracking-[0.08em] text-text-3">Sign in or sign up</p>
              <D.Title className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.02em] text-text">Continue to Kronos</D.Title>
            </div>
            <D.Close aria-label="Close" className="-mr-1 -mt-1 grid size-10 shrink-0 place-items-center rounded-ctl text-text-3 transition-colors duration-k hover:bg-surface-2 hover:text-text">
              <Cross />
            </D.Close>
          </div>
          <D.Description id="signin-desc" className="mt-2 text-15 text-text-2">
            {REASON[pending ? "submit" : req?.reason ?? ""] ?? "Continue with GitHub, an EVM wallet or a NEAR wallet. One step for new and returning teams."}
          </D.Description>

          <div className="mt-6 grid gap-2">
            {providers.isLoading ? (
              <Skeleton lines={3} className="h-[3.25rem]" />
            ) : providers.isError || !p ? (
              <div role="alert" className="rounded-ctl border border-line-2 bg-surface-2 p-4">
                <p className="text-15 text-text">Couldn’t load the sign-in options.</p>
                <p className="mt-1 break-words font-mono text-13 text-text-2">{errorMessage(providers.error)}</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => providers.refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {p.github.enabled ? (
                  <>
                    <p className={group}>GitHub</p>
                    <button type="button" onClick={github} className={option}>
                      <GitHubMark className="text-text-2" />
                      Continue with GitHub
                      <ArrowRight className="ml-auto text-text-3" />
                    </button>
                  </>
                ) : null}

                {p.siwe.enabled && wallet.connectors.length ? (
                  <>
                    <p className={group}>EVM wallet</p>
                    {wallet.connectors.map((c) => (
                      <button key={c.id} type="button" disabled={!!wallet.busy} onClick={() => wallet.evm(c.id)} className={option} aria-busy={wallet.busy === c.id || undefined}>
                        <Wallet className="text-text-2" />
                        {c.name === "Injected" ? "Browser wallet" : c.name}
                        <span className="ml-auto font-mono text-11 uppercase tracking-[0.06em] text-text-3">{wallet.busy === c.id ? "check wallet…" : "Aurora · Base"}</span>
                      </button>
                    ))}
                  </>
                ) : null}

                {p.near.enabled ? (
                  <>
                    <p className={group}>NEAR wallet</p>
                    {(
                      [
                        ["meteor-wallet", "Meteor"],
                        ["my-near-wallet", "MyNearWallet"],
                      ] as const
                    ).map(([id, name]) => (
                      <button key={id} type="button" disabled={!!wallet.busy} onClick={() => wallet.near(id)} className={option} aria-busy={wallet.busy === id || undefined}>
                        <Wallet className="text-text-2" />
                        {name}
                        <span className="ml-auto font-mono text-11 uppercase tracking-[0.06em] text-text-3">{wallet.busy === id ? "check wallet…" : `NEAR ${p.near.network}`}</span>
                      </button>
                    ))}
                  </>
                ) : null}

                {p.dev.enabled && SHOW_DEV_LOGIN && !USE_MOCKS ? (
                  <button type="button" onClick={devLogin} className="mt-2 h-10 rounded-ctl font-mono text-11 uppercase tracking-[0.06em] text-text-3 transition-colors duration-k hover:text-text">
                    Dev login (local builds only)
                  </button>
                ) : null}
              </>
            )}
          </div>

          <p className="mt-6 border-t border-line pt-4 text-13 text-text-3">
            Wallet sign-in is a signature only. It never sends a transaction or costs gas. You can link GitHub and a wallet to the same account later.
          </p>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
