"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { exchangeCode, refresh, setSession, takeReturnTo } from "@/api/auth";
import { qk } from "@/api/queries";
import { safeReturnTo } from "@/api/signin";
import { AppBar } from "@/components/SiteNav";
import { LoadingBlock } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { useAfterSignIn } from "@/components/auth/useAfterSignIn";

const ERRORS: Record<string, string> = {
  state_mismatch: "The sign-in took too long or was started in another tab. Start it again.",
  github_linked_to_another_account: "That GitHub account is already linked to a different Kronos account. Sign in with GitHub directly instead of linking it.",
  access_denied: "GitHub access was declined. Nothing was changed.",
  oauth_failed: "GitHub didn’t complete the sign-in. Try again.",
};

/**
 * GitHub return. The backend redirects here with everything in the URL fragment:
 *   #access_token=…&expires_in=900&new_user=0|1&code=…&return_to=/path     (sign-in)
 *   #installation_id=…&return_to=/path                                      (App install)
 *   #error=…&return_to=/path
 * The one-time `code` is exchanged through this site's /api rewrite, which puts the refresh cookie on
 * this domain so a reload stays signed in. If the exchange fails, the fragment's access token still
 * signs this tab in. Nothing from the fragment is stored: the token lives in memory only.
 */
export default function AuthCallback() {
  const qc = useQueryClient();
  const after = useAfterSignIn();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; // the code is single use: never run twice (React strict mode)
    ran.current = true;
    const h = new URLSearchParams(window.location.hash.slice(1));
    const q = new URLSearchParams(window.location.search);
    history.replaceState(null, "", window.location.pathname); // drop the token and code from the URL
    const err = h.get("error") ?? q.get("error");
    const token = h.get("access_token");
    const code = h.get("code");
    const isNewUser = h.get("new_user") === "1";
    const returnTo = safeReturnTo(h.get("return_to")) ?? safeReturnTo(takeReturnTo()) ?? "/p";
    if (err) return setError(err);

    void (async () => {
      if (token || code) {
        const session = code ? await exchangeCode(code) : null;
        if (!session) {
          if (!token) return setError("exchange_failed");
          setSession(token, Number(h.get("expires_in")) || 900);
        }
        await after({ isNewUser: session?.isNewUser ?? isNewUser, returnTo });
        return;
      }
      // App install bounce (#installation_id=…): the session is the refresh cookie. Reload the account.
      const ok = await refresh();
      await qc.invalidateQueries({ queryKey: qk.me });
      if (!ok) return setError("signed_out");
      window.location.replace(returnTo);
    })();
  }, [after, qc]);

  return (
    <div className="min-h-dvh">
      <AppBar />
      <main id="main" className="k-container py-20 md:py-28">
        <div className="max-w-[520px]">
          {error ? (
            <div role="alert">
              <span className="k-tag k-tag-block">sign-in failed</span>
              <h1 className="mt-5 text-title font-medium text-text">GitHub sign-in didn’t complete.</h1>
              <p className="mt-3 text-15 text-text-2">{ERRORS[error] ?? "Something went wrong on the way back from GitHub. Try again."}</p>
              <p className="mt-2 break-words font-mono text-11 text-text-3">{error}</p>
              <ButtonLink href="/connect" className="mt-7">
                Back to Link
              </ButtonLink>
            </div>
          ) : (
            <div role="status">
              <span className="k-tag k-tag-idle">signing you in</span>
              <h1 className="mt-5 text-title font-medium text-text">One moment.</h1>
              <LoadingBlock lines={2} className="mt-4 px-0" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
