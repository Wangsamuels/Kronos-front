"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setSession, takeReturnTo, refresh } from "@/api/auth";
import { AppBar } from "@/components/SiteNav";
import { LoadingBlock } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";

/**
 * GitHub OAuth return. The backend redirects to FRONTEND_URL/auth/callback#access_token=…&expires_in=…
 * (or #installation_id=… after a GitHub App install). The token stays in memory only.
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const q = new URLSearchParams(window.location.search);
    history.replaceState(null, "", window.location.pathname); // drop the token from the URL
    const token = h.get("access_token");
    const err = h.get("error") ?? q.get("error");
    const back = takeReturnTo() ?? "/connect";
    if (err) return setError(err);
    if (token) {
      setSession(token, Number(h.get("expires_in")) || 900);
      router.replace(back);
      return;
    }
    // App install bounce (#installation_id=…): session lives in the refresh cookie.
    void refresh().then(() => router.replace(back));
  }, [router]);
  return (
    <div className="min-h-dvh">
      <AppBar />
      <main id="main" className="k-container py-20 md:py-28">
        <div className="max-w-[520px]">
          {error ? (
            <div role="alert">
              <span className="k-tag k-tag-block">sign-in failed</span>
              <h1 className="mt-5 text-title font-medium text-text">GitHub sign-in didn’t complete.</h1>
              <p className="mt-3 break-words font-mono text-13 text-text-2">{error}</p>
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
