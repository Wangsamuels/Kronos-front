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
      <main id="main" className="mx-auto max-w-[560px] px-5 py-16">
        {error ? (
          <div role="alert" className="k-panel p-5">
            <p className="text-17">GitHub sign-in didn’t complete.</p>
            <p className="mt-2 font-mono text-13 text-block">{error}</p>
            <ButtonLink href="/connect" variant="secondary" className="mt-4">
              Back to Link
            </ButtonLink>
          </div>
        ) : (
          <>
            <p className="k-label">Signing you in</p>
            <LoadingBlock lines={2} className="px-0" />
          </>
        )}
      </main>
    </div>
  );
}
