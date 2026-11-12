"use client";
import { useEffect, useState } from "react";
import { AppBar } from "@/components/SiteNav";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Section";
import { Eyebrow, Field, PageHead } from "@/components/ui/Page";
import { ArrowRight } from "@/components/ui/Icons";
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
      <AppBar crumbs={[{ href: "/p", label: "Protocols" }, { href: `/p/${id}`, label: protocol.data?.name ?? "…" }, { label: "Settings" }]} />
      <main id="main" className="k-container pb-24 pt-10 md:pt-14">
        <PageHead
          eyebrow={<Eyebrow>Settings</Eyebrow>}
          title="Thresholds, alerts and team"
          lede="Tightening applies immediately. Anything that loosens the guard goes through the timelock."
          right={
            <ButtonLink href={`/p/${id}`} variant="secondary">
              <ArrowRight className="rotate-180" />
              Dashboard
            </ButtonLink>
          }
        />

        {settings.isLoading || !form ? (
          <div className="mt-10 rounded-panel border border-line-2 bg-surface">
            {settings.isError ? <ErrorState what="settings" error={settings.error} onRetry={() => settings.refetch()} /> : <LoadingBlock lines={8} />}
          </div>
        ) : (
          <div className="mt-10 grid gap-10">
            <Group title="Outflow thresholds" body="Rolling 24h net outflow per asset. Above the threshold, withdrawals are queued instead of reverted. Lowering is instant; raising is a Tier 1 timelock action (48h). The monitor can only ever tighten on its own.">
              <Panel>
                {Object.keys(form.thresholds ?? {}).length === 0 ? (
                  <EmptyState title="No assets tracked yet">Thresholds appear after the first analysis calibrates them from history.</EmptyState>
                ) : (
                  <ul className="divide-y divide-line">
                    {Object.entries(form.thresholds ?? {}).map(([asset, t]) => {
                      const h = hist[asset.toLowerCase()];
                      const was = Number(settings.data?.thresholds?.[asset]?.threshold ?? NaN);
                      const now = Number(t.threshold);
                      const dir = Number.isFinite(was) && now !== was ? (now > was ? "raise" : "lower") : null;
                      return (
                        <li key={asset} className="grid gap-4 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <p className="flex items-center gap-3">
                              <span aria-hidden className="grid size-9 place-items-center rounded-ctl border border-line-2 bg-surface-2 font-mono text-11 text-text-2">
                                {(h?.symbol ?? "?").slice(0, 1)}
                              </span>
                              <span>
                                <span className="block text-17 font-medium text-text">{h?.symbol ?? short(asset)}</span>
                                <span className="block font-mono text-11 text-text-3">{short(asset, 10, 6)}</span>
                              </span>
                            </p>
                            {dir ? <span className={cn("k-tag", dir === "raise" ? "k-tag-queue" : "k-tag-pass")}>{dir === "raise" ? "raise · queued 48h" : "lower · instant"}</span> : null}
                          </div>
                          <div className="grid gap-4 min-[520px]:grid-cols-2">
                            <Field label="Threshold" hint={h?.p999 ? `p99.9 of history: ${Number(h.p999).toLocaleString("en-US")}` : "No history yet"}>
                              <input className="k-input k-tnum" inputMode="decimal" value={t.threshold} onChange={(e) => setThr(asset, "threshold", e.target.value)} />
                            </Field>
                            <Field label="Stale-attestation limit" hint="Applies while the attestation is stale.">
                              <input className="k-input k-tnum" inputMode="decimal" value={t.staleLimit ?? ""} onChange={(e) => setThr(asset, "staleLimit", e.target.value)} />
                            </Field>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </Group>

            <Group title="Alerts" body="Where the monitor reports blocked actions, queued outflows and timelocked admin changes.">
              <Panel>
                <div className="grid gap-5 p-5">
                  <Field label="Webhook URL" optional error={urlErr(form.alerts?.webhookUrl)}>
                    <input className="k-input" value={form.alerts?.webhookUrl ?? ""} onChange={(e) => setAlert("webhookUrl", e.target.value)} aria-invalid={!!urlErr(form.alerts?.webhookUrl)} placeholder="https://ops.example/hooks/kronos" spellCheck={false} />
                  </Field>
                  <Field label="Telegram chat id" optional>
                    <input className="k-input" value={form.alerts?.telegramChatId ?? ""} onChange={(e) => setAlert("telegramChatId", e.target.value)} placeholder="-1001234567890" spellCheck={false} />
                  </Field>
                  <Field label="Discord webhook URL" optional error={urlErr(form.alerts?.discordWebhookUrl)}>
                    <input className="k-input" value={form.alerts?.discordWebhookUrl ?? ""} onChange={(e) => setAlert("discordWebhookUrl", e.target.value)} aria-invalid={!!urlErr(form.alerts?.discordWebhookUrl)} placeholder="https://discord.com/api/webhooks/…" spellCheck={false} />
                  </Field>
                </div>
                <label className="flex cursor-pointer items-start justify-between gap-6 border-t border-line p-5">
                  <span>
                    <span className="block text-15 font-medium text-text">Tighten automatically on anomalies</span>
                    <span className="mt-1 block text-13 text-text-2">Lets the monitor pause or lower caps by itself. It can never loosen anything.</span>
                  </span>
                  <span className="relative mt-0.5 inline-flex shrink-0">
                    <input type="checkbox" role="switch" className="peer sr-only" checked={!!form.autoTighten} onChange={(e) => setForm({ ...form, autoTighten: e.target.checked })} />
                    <span aria-hidden className="block h-6 w-11 rounded-full border border-line-2 bg-surface-2 transition-colors duration-k peer-checked:border-pass peer-checked:bg-pass peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text" />
                    <span aria-hidden className="absolute left-[3px] top-[3px] block size-[18px] rounded-full bg-text-3 transition-transform duration-k peer-checked:translate-x-5 peer-checked:bg-surface" />
                  </span>
                </label>
              </Panel>
            </Group>

            <Group title="Team" body="Owner, guardian (cancel-only on the timelock) and viewer. Guardians are set on-chain in the GuardTimelock.">
              <Panel>
                <ul className="divide-y divide-line">
                  <li className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="flex items-center gap-3">
                      <span aria-hidden className="grid size-9 place-items-center rounded-full border border-line-2 bg-surface-2 font-mono text-11 uppercase text-text-2">
                        {(me.data?.githubLogin ?? "y").slice(0, 1)}
                      </span>
                      <span className="font-mono text-13 text-text">{me.data?.githubLogin ? `@${me.data.githubLogin}` : me.data?.walletAddress ? short(me.data.walletAddress) : "you"}</span>
                    </span>
                    <span className="k-tag k-tag-idle">owner</span>
                  </li>
                </ul>
                <p className="border-t border-line px-5 py-3.5 text-13 text-text-3">Inviting teammates is not in the API yet.</p>
              </Panel>
            </Group>

            <div className="sticky bottom-4 z-20 lg:ml-[calc(33.333%+0.75rem)]">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-panel border border-line-2 bg-surface/95 p-3 pl-5 shadow-[0_16px_48px_-16px_rgb(0_0_0/0.25)] backdrop-blur">
                <p className="text-13" aria-live="polite">
                  {loosened.length ? (
                    <span className="text-queue">
                      Raising {loosened.length} threshold{loosened.length === 1 ? "" : "s"}: queued 48h on-chain.
                    </span>
                  ) : errs.length ? (
                    <span className="text-block">Fix the highlighted fields.</span>
                  ) : (
                    <span className="text-text-2">{dirty ? "You have unsaved changes." : "Everything is saved."}</span>
                  )}
                </p>
                <div className="flex gap-2">
                  {dirty ? (
                    <Button variant="ghost" onClick={() => settings.data && setForm(structuredClone(settings.data))}>
                      Discard
                    </Button>
                  ) : null}
                  <Button onClick={save} disabled={!dirty || errs.length > 0} busy={patch.isPending}>
                    Save settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/** Settings row: what this group is on the left, its controls on the right. */
function Group({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-10 gap-y-5 border-t border-line pt-8 lg:grid-cols-3">
      <div>
        <h2 className="text-22 font-medium text-text">{title}</h2>
        <p className="mt-2 max-w-[26rem] text-15 text-text-2">{body}</p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </section>
  );
}
