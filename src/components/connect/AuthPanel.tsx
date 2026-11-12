"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/api/auth";
import { qk, useMe, useProviders, useSession } from "@/api/queries";
import { openSignIn } from "@/api/signin";
import { USE_MOCKS } from "@/lib/env";
import { short } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { Check, GitHubMark, Wallet } from "@/components/ui/Icons";
import { githubStartUrl } from "@/components/auth/AuthModal";
import { useWalletSignIn } from "@/components/auth/useWalletSignIn";

/**
 * Access on the Link screen. Signed out, it only points at the sign-in modal. Signed in, it is where
 * a second method is linked to the same account: GitHub (and its App install) or a wallet.
 */
export function AuthPanel({ chainId }: { chainId: number }) {
  const { signedIn } = useSession();
  const me = useMe();
  const providers = useProviders();
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const here = () => window.location.pathname + window.location.search;
  const wallet = useWalletSignIn(providers.data, async () => {
    await qc.invalidateQueries({ queryKey: qk.me });
    toast({ title: "Wallet linked", body: "It is now on the same account as your sign-in.", tone: "pass" });
  });

  const p = providers.data;
  const u = me.data;
  const ghDone = !!u?.githubLogin;
  const appDone = !!u?.githubAppInstalled;
  const walletDone = !!(u?.walletAddress || u?.nearAccount);

  /** Signed in already: add GitHub to this account (linkToken), rather than creating a second one. */
  const linkGithub = () => {
    if (USE_MOCKS || !p) return;
    window.location.href = githubStartUrl(p.github.startUrl, here(), { link: true });
  };
  /** Always through the backend's /install route, so the install is attached to this account. */
  const installApp = () => {
    if (USE_MOCKS || !p) return;
    window.location.href = githubStartUrl(p.github.startUrl, here(), { install: true });
  };

  if (!signedIn) {
    return (
      <div className="rounded-panel border border-line-2 bg-surface p-5">
        <p className="text-17 font-medium text-text">Sign in when you start</p>
        <p className="mt-1 max-w-[34rem] text-13 text-text-2">GitHub, an EVM wallet or a NEAR wallet. You’ll be asked when you press Start analysis, and the form above is kept.</p>
        <Button variant="secondary" className="mt-4" onClick={() => openSignIn({ returnTo: here() })}>
          Sign in now
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-panel border border-line-2 bg-surface">
      <Row
        icon={<GitHubMark />}
        title="GitHub"
        note={ghDone ? "app not installed" : "optional"}
        done={ghDone && appDone}
        doneText={u?.githubLogin ? `@${u.githubLogin} · app installed` : undefined}
        help={
          ghDone && !appDone
            ? "Private repos and the integration pull request need the Kronos GitHub App on the repo. It reads the repo and opens one PR. Nothing else."
            : "Needed for private repos and for opening the integration pull request."
        }
      >
        {p?.github.enabled && !ghDone ? (
          <Button variant="secondary" onClick={linkGithub}>
            <GitHubMark />
            Link GitHub
          </Button>
        ) : p?.github.enabled && !appDone ? (
          <Button variant="secondary" onClick={installApp}>
            <GitHubMark />
            Install the Kronos GitHub App
          </Button>
        ) : null}
      </Row>
      <Row
        icon={<Wallet />}
        title="Wallet"
        note="optional"
        done={walletDone}
        doneText={[u?.walletAddress ? short(u.walletAddress) : null, u?.nearAccount ?? null].filter(Boolean).join(" · ") || undefined}
        help="Proves your team controls the protocol. A signature only (SIWE or NEP-413): it never moves funds."
      >
        {!walletDone ? (
          <div className="flex flex-wrap gap-2">
            {p?.siwe.enabled
              ? wallet.connectors.map((c) => (
                  <Button key={c.id} variant="secondary" busy={wallet.busy === c.id} disabled={!!wallet.busy} onClick={() => wallet.evm(c.id, chainId)}>
                    EVM · {c.name === "Injected" ? "Browser wallet" : c.name}
                  </Button>
                ))
              : null}
            {p?.near.enabled ? (
              <>
                <Button variant="secondary" busy={wallet.busy === "meteor-wallet"} disabled={!!wallet.busy} onClick={() => wallet.near("meteor-wallet")}>
                  NEAR · Meteor
                </Button>
                <Button variant="secondary" busy={wallet.busy === "my-near-wallet"} disabled={!!wallet.busy} onClick={() => wallet.near("my-near-wallet")}>
                  NEAR · MyNearWallet
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </Row>
      <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-5 py-2.5 text-13 text-text-3">
        <span className="truncate">Signed in{u?.githubLogin ? ` as @${u.githubLogin}` : u?.walletAddress ? ` as ${short(u.walletAddress)}` : u?.nearAccount ? ` as ${u.nearAccount}` : ""}</span>
        <button
          className="shrink-0 rounded-ctl px-1 text-text-2 underline decoration-line-2 underline-offset-4 transition-colors duration-k hover:text-text"
          onClick={() =>
            void logout().then(() => {
              qc.clear();
              router.push("/");
            })
          }
        >
          Sign out
        </button>
      </div>
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
