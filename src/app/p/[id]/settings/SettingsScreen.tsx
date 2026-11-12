"use client";
import { useEffect, useRef, useState } from "react";
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
import { formatAmount, fromUnits, tokenInfo, toUnits } from "@/lib/tokens";
import { cn } from "@/lib/cn";

interface HistAsset {
  asset: string;
  symbol?: string;
  p999?: string;
  p999DailyNetOutflow?: string;
  threshold?: string;
  staleLimit?: string;
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

  const histList = (((results.data?.thresholds as { assets?: HistAsset[] } | null)?.assets ?? []) as HistAsset[]).filter((a) => /^0x[0-9a-fA-F]{40}$/.test(a.asset));
  const hist = histList.reduce<Record<string, HistAsset>>((m, a) => ((m[a.asset.toLowerCase()] = a), m), {});
  // Assets to show: everything saved, plus the ones the analysis calibrated (as starting targets).
  const savedKeys = Object.keys(form?.thresholds ?? {});
  const assets = [...savedKeys, ...histList.map((a) => a.asset).filter((a) => !savedKeys.some((k) => k.toLowerCase() === a.toLowerCase()))];
  const valueOf = (asset: string) => form?.thresholds?.[asset] ?? { threshold: hist[asset.toLowerCase()]?.threshold ?? "0", staleLimit: hist[asset.toLowerCase()]?.staleLimit };

  /** Only what changed is sent: every field of the PATCH body is optional. */
  const changes = (): Partial<Settings> => {
    if (!form || !settings.data) return {};
    const out: Partial<Settings> = {};
    const thr = Object.fromEntries(Object.entries(form.thresholds ?? {}).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(settings.data!.thresholds?.[k])));
    if (Object.keys(thr).length) out.thresholds = thr;
    const norm = (v?: string | null) => v || null;
    const al = (["webhookUrl", "telegramChatId", "discordWebhookUrl"] as const).filter((k) => norm(form.alerts?.[k]) !== norm(settings.data!.alerts?.[k]));
    if (al.length) out.alerts = Object.fromEntries(al.map((k) => [k, norm(form.alerts?.[k])])) as Settings["alerts"];
    if (!!form.autoTighten !== !!settings.data.autoTighten) out.autoTighten = !!form.autoTighten;
    return out;
  };
  const dirty = Object.keys(changes()).length > 0;
  const loosened = form && settings.data ? Object.entries(form.thresholds ?? {}).filter(([k, v]) => cmp(v.threshold, settings.data!.thresholds?.[k]?.threshold) > 0) : [];
  const [badAmounts, setBadAmounts] = useState<Record<string, boolean>>({});

  const urlErr = (v?: string | null) => (v && !/^https:\/\/\S+$/.test(v) ? "Must be an https:// URL" : null);
  const errs = form ? [urlErr(form.alerts?.webhookUrl), urlErr(form.alerts?.discordWebhookUrl), ...Object.values(badAmounts).filter(Boolean).map(() => "amount")].filter(Boolean) : [];

  const save = async () => {
    if (!form || errs.length) return;
    try {
      const saved = await patch.mutateAsync(changes() as Settings);
      setForm(structuredClone(saved));
      toast({ title: "Settings saved", tone: "pass", body: loosened.length ? "Raised thresholds are recorded as your target. On-chain they change through the Tier 1 timelock (48h)." : undefined });
    } catch (e) {
      toast({ title: "Not saved", body: errorMessage(e), tone: "block" });
    }
  };

  const setAlert = (k: keyof NonNullable<Settings["alerts"]>, v: string) => setForm((f) => (f ? { ...f, alerts: { ...f.alerts, [k]: v } } : f));
  /** Values are kept exactly as the API wants them: strings in the token's smallest unit. */
  const setThr = (asset: string, k: "threshold" | "staleLimit", raw: string) =>
    setForm((f) => (f ? { ...f, thresholds: { ...f.thresholds, [asset]: { ...valueOf(asset), [k]: raw } } } : f));

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
            <Group title="Outflow thresholds" body="Rolling 24h net outflow per asset. Above the threshold, withdrawals are queued instead of reverted. The monitor alerts against these values.">
              <Panel>
                {assets.length === 0 ? (
                  <EmptyState title="No assets tracked yet">Thresholds appear after the first analysis calibrates them from history.</EmptyState>
                ) : (
                  <ul className="divide-y divide-line">
                    {assets.map((asset) => {
                      const t = valueOf(asset);
                      const h = hist[asset.toLowerCase()];
                      const info = tokenInfo(asset);
                      const symbol = info?.symbol ?? h?.symbol;
                      const was = settings.data?.thresholds?.[asset]?.threshold;
                      const dir = was !== undefined && cmp(t.threshold, was) !== 0 ? (cmp(t.threshold, was) > 0 ? "raise" : "lower") : null;
                      const p999 = h?.p999DailyNetOutflow ?? h?.p999;
                      const unit = info ? symbol : "base units";
                      return (
                        <li key={asset} className="grid gap-4 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <p className="flex items-center gap-3">
                              <span aria-hidden className="grid size-9 place-items-center rounded-ctl border border-line-2 bg-surface-2 font-mono text-11 text-text-2">
                                {(symbol ?? "?").slice(0, 1)}
                              </span>
                              <span>
                                <span className="block text-17 font-medium text-text">{symbol ?? short(asset)}</span>
                                <span className="block font-mono text-11 text-text-3">{short(asset, 10, 6)}</span>
                              </span>
                            </p>
                            {dir ? <span className={cn("k-tag", dir === "raise" ? "k-tag-queue" : "k-tag-pass")}>{dir === "raise" ? "raise · timelocked on-chain" : "lower"}</span> : null}
                          </div>
                          <div className="grid gap-4 min-[520px]:grid-cols-2">
                            <AmountField
                              label={`Threshold (${unit})`}
                              raw={t.threshold}
                              decimals={info?.decimals}
                              hint={p999 ? `p99.9 of daily net outflow: ${formatAmount(p999, asset)}` : "No history yet"}
                              onRaw={(v) => setThr(asset, "threshold", v)}
                              onValid={(ok) => setBadAmounts((b) => ({ ...b, [`${asset}:t`]: !ok }))}
                            />
                            <AmountField
                              label={`Stale-attestation limit (${unit})`}
                              raw={t.staleLimit ?? ""}
                              decimals={info?.decimals}
                              hint="Applies while the attestation is stale."
                              onRaw={(v) => setThr(asset, "staleLimit", v)}
                              onValid={(ok) => setBadAmounts((b) => ({ ...b, [`${asset}:s`]: !ok }))}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="border-t border-line px-5 py-3.5 text-13 text-text-3">Saved here as your target. Changing a threshold on-chain is a Tier 1 timelocked action; the monitor can only tighten on its own.</p>
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
                    <span className="mt-1 block text-13 text-text-2">On: the monitor may lower outflow limits by itself, signed onto each chain through NEAR Chain Signatures. Off: it alerts, but never pauses or lowers limits. Either way its key can only tighten.</span>
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
                      Raising {loosened.length} threshold{loosened.length === 1 ? "" : "s"}: saved as a target, timelocked on-chain.
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

/** Compare two smallest-unit amount strings without losing precision. */
function cmp(a?: string | null, b?: string | null) {
  try {
    const x = BigInt(a || "0");
    const y = BigInt(b || "0");
    return x === y ? 0 : x > y ? 1 : -1;
  } catch {
    return Number(a) - Number(b);
  }
}

/**
 * Edits an amount in whole tokens and reports it in the token's smallest unit. When the token's
 * decimals are not known, the raw value is edited as-is and the label says "base units".
 */
function AmountField({ label, raw, decimals, hint, onRaw, onValid }: { label: string; raw: string; decimals?: number; hint?: string; onRaw: (raw: string) => void; onValid: (ok: boolean) => void }) {
  const show = (r: string) => (decimals === undefined ? r : fromUnits(r, decimals));
  const [text, setText] = useState(() => show(raw));
  const [bad, setBad] = useState(false);
  const last = useRef(raw);
  // The saved value changed underneath (save, discard): show it.
  useEffect(() => {
    if (raw !== last.current) {
      last.current = raw;
      setText(show(raw));
      setBad(false);
      onValid(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  return (
    <Field label={label} hint={hint} error={bad ? (decimals === undefined ? "Whole numbers only" : `A number with up to ${decimals} decimals`) : null}>
      <input
        className="k-input k-tnum"
        inputMode="decimal"
        value={text}
        aria-invalid={bad}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const units = decimals === undefined ? (/^\d+$/.test(v.trim()) ? v.trim() : null) : toUnits(v, decimals);
          setBad(units === null);
          onValid(units !== null);
          if (units !== null) {
            last.current = units;
            onRaw(units);
          }
        }}
      />
    </Field>
  );
}
