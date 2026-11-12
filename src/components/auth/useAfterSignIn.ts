"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api, unwrap } from "@/api/client";
import { errorMessage } from "@/api/errors";
import { clearPendingSubmit, closeSignIn, peekPendingSubmit, safeReturnTo } from "@/api/signin";
import { useToast } from "@/components/ui/Toast";

/**
 * What happens after any successful sign-in, whichever method was used: if the reader had already
 * filled in a repo, submit it and open the new analysis; otherwise go where they were heading.
 * isNewUser only changes the greeting.
 */
export function useAfterSignIn() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  return useCallback(
    async ({ isNewUser, returnTo }: { isNewUser?: boolean; returnTo?: string | null }) => {
      closeSignIn();
      await qc.invalidateQueries();
      const pending = peekPendingSubmit();
      if (pending) {
        clearPendingSubmit();
        try {
          const res = await unwrap(api.POST("/v1/protocols", { body: pending }));
          toast({ title: isNewUser ? "Welcome to Kronos" : "Welcome back", body: "Your analysis has started.", tone: "pass" });
          router.replace(`/p/${res.protocol.id}/analysis`);
          return;
        } catch (e) {
          toast({ title: "Couldn’t start the analysis", body: errorMessage(e), tone: "block" });
          const q = new URLSearchParams();
          if (pending.repoUrl) q.set("repo", pending.repoUrl);
          if (pending.websiteUrl) q.set("website", pending.websiteUrl);
          router.replace(`/connect?${q.toString()}`);
          return;
        }
      }
      toast({ title: isNewUser ? "Welcome to Kronos" : "Welcome back", body: isNewUser ? "Your account is ready." : "You’re signed in.", tone: "pass" });
      const to = safeReturnTo(returnTo);
      if (to && to !== window.location.pathname + window.location.search) router.replace(to);
    },
    [router, qc, toast],
  );
}
