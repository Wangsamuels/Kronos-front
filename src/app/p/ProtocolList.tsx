"use client";
import Link from "next/link";
import { useEffect } from "react";
import { AppBar } from "@/components/SiteNav";
import { ProtocolStatusPill } from "@/components/StatusPill";
import { Button, ButtonLink } from "@/components/ui/Button";
import { openSignIn } from "@/api/signin";
import { Eyebrow, PageHead } from "@/components/ui/Page";
import { ArrowRight, Plus } from "@/components/ui/Icons";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useProtocols, useSession } from "@/api/queries";
import { ApiError } from "@/api/errors";
import { chainName } from "@/lib/chains";
import type { Protocol } from "@/api/types";

/** Where a protocol should open: the dashboard once live, otherwise the step it is on. */
export function protocolHref(p: Protocol) {
  if (p.status === "live" || p.status === "paused") return `/p/${p.id}`;
  if (p.status === "review") return `/p/${p.id}/review`;
  if (p.status === "integrating") return `/p/${p.id}/integrate`;
  return `/p/${p.id}/analysis`;
}

export function ProtocolList() {
  const { token } = useSession();
  const q = useProtocols();
  // Signed in (or out) since the last fetch: ask again rather than showing the old answer.
  useEffect(() => {
    void q.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const count = q.data?.items.length ?? 0;
  return (
    <div className="min-h-dvh">
      <AppBar crumbs={[{ label: "Protocols" }]} />
      <main id="main" className="k-container pb-24 pt-10 md:pt-14">
        <PageHead
          eyebrow={<Eyebrow>Protocols</Eyebrow>}
          title="Your protocols"
          lede="Each one opens where you left it: the step it is on, or its dashboard once the guard is live."
          right={
            <ButtonLink href="/connect">
              <Plus />
              Protect a protocol
            </ButtonLink>
          }
        />
        <div className="mt-10 overflow-hidden rounded-panel border border-line-2 bg-surface">
          {q.isLoading ? (
            <LoadingBlock lines={4} />
          ) : q.isError ? (
            q.error instanceof ApiError && q.error.status === 401 ? (
              <EmptyState title="Sign in to see your protocols" action={<Button onClick={() => openSignIn({ returnTo: "/p", reason: "protocols" })}>Sign in</Button>}>
                Protocols are tied to the GitHub account that linked them.
              </EmptyState>
            ) : (
              <ErrorState what="protocols" error={q.error} onRetry={() => q.refetch()} />
            )
          ) : !count ? (
            <EmptyState title="No protocols yet" action={<ButtonLink href="/connect">Link your first protocol</ButtonLink>}>
              Paste a repo and Kronos maps it, drafts the invariants and attacks them on a fork.
            </EmptyState>
          ) : (
            <>
              <div className="k-bar hidden md:grid md:grid-cols-12 md:gap-4">
                <span className="md:col-span-4">Protocol</span>
                <span className="md:col-span-2">Chain</span>
                <span className="md:col-span-4">Source</span>
                <span className="md:col-span-2 md:text-right">Status</span>
              </div>
              <ul>
                {q.data!.items.map((p) => (
                  <li key={p.id} className="border-b border-line last:border-b-0">
                    <Link href={protocolHref(p)} className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-4 py-4 transition-colors duration-k hover:bg-surface-2 md:grid-cols-12 md:px-5 md:py-5">
                      <span className="flex items-center gap-3 text-17 font-medium text-text md:col-span-4">
                        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-ctl border border-line-2 bg-surface-2 font-mono text-13 uppercase text-text-2">
                          {p.name.slice(0, 1)}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="row-start-1 col-start-2 justify-self-end md:order-last md:col-span-2 md:row-auto md:flex md:items-center md:justify-end md:gap-3">
                        <ProtocolStatusPill status={p.status} />
                        <ArrowRight className="hidden size-4 text-text-3 transition-[color,transform] duration-k group-hover:translate-x-0.5 group-hover:text-text md:block" />
                      </span>
                      <span className="col-span-2 pl-12 font-mono text-13 text-text-2 md:col-span-2 md:pl-0">{chainName(p.chainId)}</span>
                      <span className="col-span-2 truncate pl-12 font-mono text-13 text-text-3 md:col-span-4 md:pl-0">{p.repoUrl?.replace(/^https:\/\/github\.com\//, "") ?? p.websiteUrl}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {count ? (
          <p className="k-tnum mt-3 font-mono text-11 text-text-3">
            {count} protocol{count === 1 ? "" : "s"}
          </p>
        ) : null}
      </main>
    </div>
  );
}
