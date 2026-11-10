"use client";
import Link from "next/link";
import { AppBar } from "@/components/SiteNav";
import { ProtocolStatusPill } from "@/components/StatusPill";
import { ButtonLink } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Section";
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
  const { signedIn } = useSession();
  const q = useProtocols();
  return (
    <div className="min-h-dvh">
      <AppBar crumbs={[{ label: "Protocols" }]} right={<ButtonLink href="/connect" size="sm">Protect a protocol</ButtonLink>} />
      <main id="main" className="k-container py-10">
        <SectionLabel>Protocols</SectionLabel>
        <h1 className="mt-3 text-32 font-medium">Your protocols</h1>
        <div className="k-panel mt-8">
          {q.isLoading ? (
            <LoadingBlock lines={4} />
          ) : q.isError ? (
            q.error instanceof ApiError && q.error.status === 401 && !signedIn ? (
              <EmptyState action={<ButtonLink href="/connect">Sign in and link a protocol</ButtonLink>}>Sign in to see your protocols.</EmptyState>
            ) : (
              <ErrorState what="protocols" error={q.error} onRetry={() => q.refetch()} />
            )
          ) : !q.data?.items.length ? (
            <EmptyState action={<ButtonLink href="/connect">Link your first protocol</ButtonLink>}>No protocols yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {q.data.items.map((p) => (
                <li key={p.id}>
                  <Link href={protocolHref(p)} className="grid gap-2 px-5 py-4 hover:bg-surface-2 md:grid-cols-12 md:items-center">
                    <span className="text-17 text-text md:col-span-4">{p.name}</span>
                    <span className="font-mono text-13 text-text-3 md:col-span-3">{chainName(p.chainId)}</span>
                    <span className="truncate font-mono text-13 text-text-3 md:col-span-3">{p.repoUrl?.replace(/^https:\/\/github\.com\//, "") ?? p.websiteUrl}</span>
                    <span className="md:col-span-2 md:text-right">
                      <ProtocolStatusPill status={p.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
