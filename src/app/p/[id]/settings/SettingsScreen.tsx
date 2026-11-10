"use client";
import { useEffect, useState } from "react";
import { AppBar } from "@/components/SiteNav";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel, SectionLabel } from "@/components/ui/Section";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useMe, usePatchSettings, useProtocol, useResults, useSettings } from "@/api/queries";
import { errorMessage } from "@/api/errors";
import type { Settings } from "@/api/types";
import { short } from "@/lib/format";
import { cn } from "@/lib/cn";

interface HistAsset {
  asset: string;
  symbol?: string;
  p999?: string;
  threshold?: string;
}

/** Outflow thresholds per asset (with historical percentile), alert channels, team. Light theme. */
export function SettingsScreen({ id }: { id: string }) {
  const toast = useToast();
  const protocol = useProtocol(id);
  const settings = useSettings(id);
  const results = useResults(protocol.data?.latestRunId);
  const me = useMe();
  const patch = usePatchSettings(id);
  const [form, setForm] = useState<Settings | null>(null);
  useEffect(() => {
    if (settings.data && !form) setForm(structuredClone(settings.data));
  }, [settings.data, form]);

  const hist = (((results.data?.thresholds as { assets?: HistAsset[] } | null)?.assets ?? []) as HistAsset[]).reduce<Record<string, HistAsset>>((m, a) => ((m[a.asset.toLowerCase()] = a), m), {});
  const dirty = form && settings.data && JSON.stringify(form) !== JSON.stringify(settings.data);
  const loosened = form && settings.data ? Object.entries(form.thresholds ?? {}).filter(([k, v]) => Number(v.threshold) > Number(settings.data!.thresholds?.[k]?.threshold ?? Infinity)) : [];

  const urlErr = (v?: string | null) => (v && !/^https:\/\/\S+$/.test(v) ? "Must be an https:// URL" : null);
  const errs = form ? [urlErr(form.alerts?.webhookUrl), urlErr(form.alerts?.discordWebhookUrl)].filter(Boolean) : [];

  const save = async () => {
    if (!form || errs.length) return;
    try {
      const saved = await patch.mutateAsync({
        thresholds: form.thresholds,
        alerts: {
          webhookUrl: form.alerts?.webhookUrl || null,
          telegramChatId: form.alerts?.telegramChatId || null,
          discordWebhookUrl: form.alerts?.discordWebhookUrl || null,
        },
        autoTighten: form.autoTighten,
      });
      setForm(structuredClone(saved));
      toast({ title: "settings saved", tone: "pass", body: loosened.length ? "Raised thresholds take effect on-chain after the Tier 1 timelock (48h)." : undefined });
    } catch (e) {
      toast({ title: "Not saved", body: errorMessage(e), tone: "block" });
    }
  };

  const setAlert = (k: keyof NonNullable<Settings["alerts"]>, v: string) => setForm((f) => (f ? { ...f, alerts: { ...f.alerts, [k]: v } } : f));
  const setThr = (asset: string, k: "threshold" | "staleLimit", v: string) =>
    setForm((f) => (f ? { ...f, thresholds: { ...f.thresholds, [asset]: { ...(f.thresholds?.[asset] ?? { threshold: "0" }), [k]: v.replace(/[^\d.]/g, "") } } } : f));

  return (
    <div data-theme="light" className="min-h-dvh bg-bg text-text">
      <AppBar crumbs={[{ href: "/p", label: "Protocols" }, { href: `/p/${id}`, label: protocol.data?.name ?? "…" }, { label: "Settings" }]} right={<ButtonLink href={`/p/${id}`} variant="secondary" size="sm">Dashboard</ButtonLink>} />
      <main id="main" className="mx-auto w-full max-w-[880px] px-5 py-10 md:px-8">
        <SectionLabel>Settings</SectionLabel>
        <h1 className="mt-3 text-32 font-medium">Thresholds, alerts and team</h1>

        {settings.isLoading || !form ? (
          settings.isError ? (
            <ErrorState className="mt-8" what="settings" error={settings.error} onRetry={() => settings.refetch()} />
          ) : (
            <LoadingBlock className="mt-8" lines={8} />
          )
        ) : (
          <div className="mt-8 grid gap-6">
            <Panel label="Outflow thresholds · rolling 24h net">
              {Object.keys(form.thresholds ?? {}).length === 0 ? (
                <EmptyState>No assets are tracked yet. Thresholds appear after the first analysis calibrates them from history.</EmptyState>
              ) : (
                <ul className="divide-y divide-line">
                  {Object.entries(form.thresholds ?? {}).map(([asset, t]) => {
                    const h = hist[asset.toLowerCase()];
                    return (
                      <li key={asset} className="grid gap-3 px-5 py-4 md:grid-cols-12 md:items-end">
                        <div className="md:col-span-4">
                          <p className="font-mono text-15 text-text">{h?.symbol ?? short(asset)}</p>
                          <p className="font-mono text-11 text-text-3">{short(asset, 10, 6)}</p>
                        </div>
                        <label className="grid gap-1 md:col-span-3">
                          <span className="k-label">Threshold</span>
                          <input className="k-input" inputMode="decimal" value={t.threshold} onChange={(e) => setThr(asset, "threshold", e.target.value)} />
                        </label>
                        <label className="grid gap-1 md:col-span-3">
                          <span className="k-label">Stale-attestation limit</span>
                          <input className="k-input" inputMode="decimal" value={t.staleLimit ?? ""} onChange={(e) => setThr(asset, "staleLimit", e.target.value)} />
                        </label>
                        <p className="font-mono text-11 text-text-3 md:col-span-2">{h?.p999 ? `p99.9 history: ${Number(h.p999).toLocaleString("en-US")}` : "no history"}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="border-t border-line px-5 py-3 text-13 text-text-3">
                Lowering a threshold is instant. Raising one is a Tier 1 timelock action on-chain (48h). The monitor can only ever tighten on its own.
              </p>
            </Panel>

            <Panel label="Alert channels">
              <div className="grid gap-4 p-5">
                <Field label="Webhook URL" value={form.alerts?.webhookUrl ?? ""} onChange={(v) => setAlert("webhookUrl", v)} err={urlErr(form.alerts?.webhookUrl)} placeholder="https://ops.example/hooks/kronos" />
                <Field label="Telegram chat id" value={form.alerts?.telegramChatId ?? ""} onChange={(v) => setAlert("telegramChatId", v)} placeholder="-1001234567890" />
                <Field label="Discord webhook URL" value={form.alerts?.discordWebhookUrl ?? ""} onChange={(v) => setAlert("discordWebhookUrl", v)} err={urlErr(form.alerts?.discordWebhookUrl)} placeholder="https://discord.com/api/webhooks/…" />
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="size-5 accent-[rgb(var(--text))]" checked={!!form.autoTighten} onChange={(e) => setForm({ ...form, autoTighten: e.target.checked })} />
                  <span className="text-15">Let the monitor tighten automatically (pause, lower caps) on anomalies</span>
                </label>
              </div>
            </Panel>

            <Panel label="Team">
              <ul className="divide-y divide-line">
                <li className="flex items-center justify-between px-5 py-3">
                  <span className="font-mono text-13">{me.data?.githubLogin ? `@${me.data.githubLogin}` : me.data?.walletAddress ? short(me.data.walletAddress) : "you"}</span>
                  <span className="font-mono text-11 uppercase tracking-[0.06em] text-text-2">owner</span>
                </li>
              </ul>
              <p className="border-t border-line px-5 py-3 text-13 text-text-3">
                Roles: owner, guardian (cancel-only on the timelock), viewer. Guardians are set on-chain in the GuardTimelock. Inviting teammates is not in the API yet.
              </p>
            </Panel>

            <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-4 border-t border-line bg-bg px-5 py-4 md:-mx-8 md:px-8">
              <Button onClick={save} disabled={!dirty || errs.length > 0} busy={patch.isPending}>
                Save settings
              </Button>
              {loosened.length ? <span className="font-mono text-13 text-queue">raising {loosened.length} threshold(s): queued 48h on-chain</span> : <span className="text-13 text-text-3">{dirty ? "Unsaved changes" : "Up to date"}</span>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, err, placeholder }: { label: string; value: string; onChange: (v: string) => void; err?: string | null; placeholder?: string }) {
  return (
    <label className="grid gap-1">
      <span className="k-label">{label}</span>
      <input className={cn("k-input")} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!err} placeholder={placeholder} spellCheck={false} />
      {err ? <span className="font-mono text-11 text-block">{err}</span> : null}
    </label>
  );
}
