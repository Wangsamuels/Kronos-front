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
      <div className="k-panel p-5">
        <p className="mb-2 font-mono text-13 text-queue/90">not supported yet · waitlist</p>
        <p className="text-17 text-text">Kronos supports lending protocols today. Bridges are next.</p>
        <p className="mt-2 text-15 text-text-2">
          We’ll email you when <span className="font-mono text-text">{protocolType}</span> protocols can be analyzed. Your repo link is kept with the request.
        </p>
        {m.isSuccess ? (
          <p className="mt-4 font-mono text-13 text-pass" role="status">
            ✓ on the waitlist for {protocolType}
          </p>
        ) : (
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) m.mutate({ email, protocolType });
            }}
          >
            <label htmlFor="wl-email" className="sr-only">
              Email
            </label>
            <input id="wl-email" type="email" required className="k-input max-w-xs flex-1" placeholder="you@protocol.xyz" value={email} onChange={(e) => setEmail(e.target.value)} />
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
