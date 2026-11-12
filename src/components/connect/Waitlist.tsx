"use client";
import { useState } from "react";
import { useWaitlist } from "@/api/queries";
import { errorMessage } from "@/api/errors";
import { Button } from "@/components/ui/Button";

/** Non-lending protocols branch here instead of a dead end. POST /v1/waitlist {email, protocolType}. */
export function Waitlist({ protocolType, className }: { protocolType: string; className?: string }) {
  const [email, setEmail] = useState("");
  const m = useWaitlist();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return (
    <div className={className}>
      <div className="rounded-panel border border-line-2 bg-surface p-5 md:p-6">
        <span className="k-tag k-tag-queue">not supported yet</span>
        <p className="mt-4 text-22 font-medium text-text">Lending is live today. Bridges are next.</p>
        <p className="mt-2 max-w-[34rem] text-15 text-text-2">
          Leave an email and we’ll tell you when <span className="font-mono text-13 text-text">{protocolType}</span> protocols can be analyzed. Your repo link is kept with the request.
        </p>
        {m.isSuccess ? (
          <p className="mt-5 flex items-center gap-2.5 text-15 text-text" role="status">
            <span className="k-tag k-tag-pass">added</span>
            You’re on the waitlist for {protocolType}.
          </p>
        ) : (
          <form
            className="mt-5 flex flex-col gap-2 min-[480px]:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) m.mutate({ email, protocolType });
            }}
          >
            <label htmlFor="wl-email" className="sr-only">
              Email
            </label>
            <input id="wl-email" type="email" required className="k-input min-[480px]:max-w-xs" placeholder="you@protocol.xyz" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" disabled={!valid} busy={m.isPending}>
              Join the waitlist
            </Button>
          </form>
        )}
        {m.isError ? <p className="mt-2 font-mono text-13 text-block">{errorMessage(m.error)}</p> : null}
      </div>
    </div>
  );
}
