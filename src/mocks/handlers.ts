/**
 * MSW handlers typed against the same OpenAPI file the client is generated from (openapi-msw):
 * a path or body that drifts from contracts/openapi.json fails `pnpm typecheck`.
 */
import { HttpResponse, delay } from "msw";
import { createOpenApiHttp } from "openapi-msw";
import { zipSync, strToU8 } from "fflate";
import type { paths } from "@/api/schema";
import { advance, createProtocol, db, nextEventAt, overview, publicRun, results, save, scriptPackaging, startRun, verifyDeployment, visibleEvents } from "./db";
import { AURORA_TESTNET, BASE_SEPOLIA, packageFiles } from "./data";

const http = createOpenApiHttp<paths>({ baseUrl: "*" });
const LAT = 120;

/** Error bodies are not declared per-route in openapi.json, so they bypass the typed response check. */
const err = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message } }, { status }) as never;

// ---- auth: token = "mock.<userId>.<issuedAt>"; the "refresh cookie" is a localStorage flag.
const SESSION_KEY = "kronos.mock.session";
function issue(userId: string) {
  localStorage.setItem(SESSION_KEY, userId);
  return { accessToken: `mock.${userId}.${Date.now()}`, expiresIn: 900, userId };
}
function userFrom(req: Request): string | null {
  const h = req.headers.get("authorization");
  const q = new URL(req.url).searchParams.get("token");
  const tok = h?.replace(/^Bearer\s+/i, "") ?? q;
  const m = tok?.match(/^mock\.([^.]+)\.\d+$/);
  return m?.[1] ?? null;
}

function ensureUser(id: string, login: string | null) {
  const s = db();
  s.users[id] ??= { id, githubLogin: login, walletAddress: null, nearAccount: null, githubAppInstalled: true, createdAt: new Date().toISOString() };
  save();
  return s.users[id]!;
}

function protocolOr404(id: string) {
  return db().protocols.find((p) => p.id === id);
}

export const handlers = [
  http.get("/healthz", () => HttpResponse.json({ ok: true, db: "mock", redis: "mock", queues: "mock" }) as never),

  http.get("/v1/meta", () =>
    HttpResponse.json({
      version: "1.0.0-mock",
      chains: [
        { chainId: AURORA_TESTNET, name: "Aurora testnet" },
        { chainId: BASE_SEPOLIA, name: "Base Sepolia" },
      ],
      integrations: { github: "mock", llm: "mock", prover: "signed attestations" },
      devLogin: true,
      protocolTypes: [
        { type: "lending", available: true },
        { type: "bridge", available: false },
        { type: "dex", available: false },
        { type: "perps", available: false },
        { type: "vault", available: false },
      ],
    }),
  ),

  http.post("/v1/auth/dev", async ({ request }) => {
    await delay(LAT);
    const body = (await request.json().catch(() => ({}))) as { login?: string };
    const login = body.login ?? "demo";
    const id = `user-${login}`;
    ensureUser(id, login);
    return HttpResponse.json(issue(id));
  }),
  http.post("/v1/auth/refresh", async () => {
    await delay(60);
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return err(401, "UNAUTHENTICATED", "No refresh cookie");
    return HttpResponse.json(issue(id));
  }),
  http.post("/v1/auth/logout", () => {
    localStorage.removeItem(SESSION_KEY);
    return new HttpResponse(null, { status: 204 }) as never;
  }),
  http.get("/v1/auth/nonce", () => HttpResponse.json({ nonce: Math.random().toString(36).slice(2, 14) })),
  http.post("/v1/auth/wallet", async ({ request }) => {
    await delay(LAT);
    const body = await request.json();
    const current = userFrom(request);
    const id = current ?? `user-${body.type === "near" ? body.accountId : "wallet"}`;
    const u = ensureUser(id, null);
    if (body.type === "near") u.nearAccount = body.accountId;
    else u.walletAddress = body.message.match(/0x[0-9a-fA-F]{40}/)?.[0] ?? "0x0000000000000000000000000000000000000000";
    save();
    return HttpResponse.json(issue(id));
  }),
  http.get("/v1/me", ({ request }) => {
    const id = userFrom(request);
    if (!id) return err(401, "UNAUTHENTICATED", "Sign in first");
    return HttpResponse.json(ensureUser(id, id.replace(/^user-/, "")));
  }),

  http.post("/v1/waitlist", async ({ request }) => {
    const body = await request.json();
    db().waitlist.push(body);
    save();
    return HttpResponse.json({ ok: true as const }, { status: 201 });
  }),

  // ---- protocols
  http.post("/v1/protocols", async ({ request }) => {
    await delay(LAT * 2);
    const uid = userFrom(request);
    if (!uid) return err(401, "UNAUTHENTICATED", "Sign in first");
    const body = await request.json();
    if (!body.repoUrl && !body.websiteUrl) return err(400, "VALIDATION", "repoUrl or websiteUrl is required");
    const { protocol, run } = createProtocol(uid, body);
    return HttpResponse.json({ protocol, analysisId: run.id }, { status: 201 });
  }),
  http.get("/v1/protocols", async () => {
    await delay(LAT);
    advance();
    return HttpResponse.json({ items: db().protocols, nextCursor: null });
  }),
  http.get("/v1/protocols/{id}", async ({ params }) => {
    await delay(LAT);
    advance();
    const p = protocolOr404(params.id);
    return p ? HttpResponse.json(p) : err(404, "NOT_FOUND", "Protocol not found");
  }),
  http.post("/v1/protocols/{id}/analyses", async ({ params }) => {
    const s = db();
    const p = protocolOr404(params.id);
    if (!p) return err(404, "NOT_FOUND", "Protocol not found");
    const run = startRun(s, p);
    save();
    return HttpResponse.json(publicRun(run), { status: 201 });
  }),

  // ---- analyses
  http.get("/v1/analyses/{id}", ({ params }) => {
    advance();
    const run = db().runs[params.id];
    return run ? HttpResponse.json(publicRun(run)) : err(404, "NOT_FOUND", "Analysis not found");
  }),
  http.get("/v1/analyses/{id}/results", async ({ params }) => {
    await delay(LAT);
    advance();
    const run = db().runs[params.id];
    if (!run) return err(404, "NOT_FOUND", "Analysis not found");
    return HttpResponse.json(results(params.id));
  }),
  http.patch("/v1/invariants/{id}", async ({ params, request }) => {
    const body = await request.json();
    for (const [runId, list] of Object.entries(db().invariants)) {
      const i = list.find((x) => x.id === params.id);
      if (!i) continue;
      if (db().runs[runId]?.status !== "review") return err(403, "FORBIDDEN", "Review edits are only allowed during review");
      if (body.status) i.status = body.status;
      if (body.params) i.params = { ...i.params, ...body.params };
      save();
      return HttpResponse.json(i);
    }
    return err(404, "NOT_FOUND", "Invariant not found");
  }),
  http.patch("/v1/intent-schemas/{id}", async ({ params, request }) => {
    const body = await request.json();
    for (const list of Object.values(db().intents)) {
      const i = list.find((x) => x.id === params.id);
      if (!i) continue;
      if (body.status) i.status = body.status;
      if (body.bounds) i.bounds = { ...(i.bounds as object), ...body.bounds };
      save();
      return HttpResponse.json(i);
    }
    return err(404, "NOT_FOUND", "Intent schema not found");
  }),
  http.patch("/v1/tiers/{id}", async ({ params, request }) => {
    const body = await request.json();
    for (const list of Object.values(db().tiers)) {
      const t = list.find((x) => x.id === params.id);
      if (!t) continue;
      if (body.tier !== undefined) {
        if (t.source === "rule" && body.tier < t.tier) return err(409, "RULE_LOCKED", "Hard rules can only be made stricter");
        t.tier = body.tier;
        t.delaySeconds = [0, 172800, 604800, 1209600][body.tier] ?? 0;
      }
      if (body.status) t.status = body.status;
      save();
      return HttpResponse.json(t);
    }
    return err(404, "NOT_FOUND", "Tier not found");
  }),
  http.post("/v1/analyses/{id}/approve", async ({ params }) => {
    await delay(LAT * 2);
    advance();
    const s = db();
    const run = s.runs[params.id];
    if (!run) return err(404, "NOT_FOUND", "Analysis not found");
    if (run.status !== "review") return err(409, "CONFLICT", `Run is ${run.status}`);
    const flagged = (s.invariants[run.id] ?? []).filter((i) => i.needsReview && i.status === "proposed");
    if (flagged.length) return err(409, "CONFLICT", `${flagged.length} flagged invariant(s) must be decided first`);
    for (const i of s.invariants[run.id] ?? []) if (i.status === "proposed") i.status = "approved";
    for (const i of s.intents[run.id] ?? []) if (i.status === "proposed") i.status = "approved";
    for (const i of s.tiers[run.id] ?? []) if (i.status === "proposed") i.status = "approved";
    if (!(s.invariants[run.id] ?? []).some((i) => i.status === "approved")) return err(409, "CONFLICT", "At least one invariant must be approved");
    run.status = "approved";
    run.stage = "package";
    const p = s.protocols.find((x) => x.id === run.protocolId);
    if (p) p.status = "approved";
    scriptPackaging(run); // emits the "Review approved…" stage event at once, then packaging
    save();
    return HttpResponse.json(publicRun(run), { status: 202 });
  }),

  /**
   * Scripted SSE. Mirrors api/sse.ts in the backend: `retry: 3000`, replay of events with
   * id > (Last-Event-ID header ?? ?lastEventId), then live events as their time comes, and the
   * response ends after the replay when the run is resting (review, failed, packaged).
   */
  http.get("/v1/analyses/{id}/stream", ({ params, request }) => {
    const run = db().runs[params.id];
    if (!run) return err(404, "NOT_FOUND", "Analysis not found");
    if (!userFrom(request)) return err(401, "UNAUTHENTICATED", "token required");
    const url = new URL(request.url);
    let lastId = Number(request.headers.get("last-event-id") ?? url.searchParams.get("lastEventId") ?? 0) || 0;
    const enc = new TextEncoder();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(enc.encode("retry: 3000\n\n"));
        const pump = () => {
          advance();
          const fresh = db().runs[params.id];
          if (!fresh) return controller.close();
          for (const ev of visibleEvents(fresh, lastId)) {
            controller.enqueue(enc.encode(`id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`));
            lastId = ev.id;
            if (ev.type === "done" || ev.type === "error") {
              const more = nextEventAt(fresh, lastId);
              if (!more) return controller.close();
            }
          }
          const next = nextEventAt(fresh, lastId);
          const resting = ["review", "failed", "packaged"].includes(fresh.status);
          if (next === undefined && resting) return controller.close();
          timer = setTimeout(pump, next === undefined ? 1000 : Math.max(16, next - Date.now()));
        };
        pump();
      },
      cancel() {
        if (timer) clearTimeout(timer);
      },
    });
    return new HttpResponse(stream, {
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" },
    }) as never;
  }),

  // ---- packages
  http.get("/v1/analyses/{id}/package", ({ params }) => {
    advance();
    const pkg = db().packages.find((x) => x.runId === params.id);
    if (!pkg) return err(404, "NOT_FOUND", "Package not built yet");
    return HttpResponse.json({ ...pkg, downloadUrl: `/v1/packages/${pkg.id}/download` });
  }),
  http.get("/v1/packages/{id}", ({ params }) => {
    const pkg = db().packages.find((x) => x.id === params.id);
    if (!pkg) return err(404, "NOT_FOUND", "Package not found");
    return HttpResponse.json({ ...pkg, downloadUrl: `/v1/packages/${pkg.id}/download` });
  }),
  http.get("/v1/packages/{id}/download", ({ params }) => {
    const s = db();
    const pkg = s.packages.find((x) => x.id === params.id);
    if (!pkg) return err(404, "NOT_FOUND", "Package not found");
    const run = s.runs[pkg.runId];
    const p = s.protocols.find((x) => x.id === run?.protocolId);
    const files = packageFiles(p?.name.replace(/\W/g, "") || "MiniLend");
    const zip = zipSync(Object.fromEntries(files.map((f) => [f.path, strToU8(f.content)])));
    return new HttpResponse(zip, {
      headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="kronos-package-${pkg.version}.zip"` },
    }) as never;
  }),
  http.post("/v1/packages/{id}/pull-request", async ({ params }) => {
    await delay(900);
    const s = db();
    const pkg = s.packages.find((x) => x.id === params.id);
    if (!pkg) return err(404, "NOT_FOUND", "Package not found");
    const run = s.runs[pkg.runId];
    const p = s.protocols.find((x) => x.id === run?.protocolId);
    const repo = p?.repoUrl?.startsWith("https://github.com/") ? p.repoUrl.replace(/\/+$/, "") : "https://github.com/minilend/protocol";
    pkg.prUrl = `${repo}/pull/42`;
    save();
    return HttpResponse.json({ prUrl: pkg.prUrl });
  }),

  // ---- deployments + dashboard
  http.post("/v1/protocols/{id}/deployments", async ({ params, request }) => {
    await delay(700);
    const p = protocolOr404(params.id);
    if (!p) return err(404, "NOT_FOUND", "Protocol not found");
    const body = await request.json();
    return HttpResponse.json(verifyDeployment(p, body), { status: 201 });
  }),
  http.get("/v1/protocols/{id}/deployments", ({ params }) =>
    HttpResponse.json(db().deployments.filter((d) => d.protocolId === params.id)),
  ),
  http.get("/v1/protocols/{id}/overview", async ({ params }) => {
    await delay(LAT);
    const p = protocolOr404(params.id);
    if (!p) return err(404, "NOT_FOUND", "Protocol not found");
    return HttpResponse.json(overview(p) as never);
  }),
  http.get("/v1/protocols/{id}/events", async ({ params, request }) => {
    await delay(LAT);
    const kind = new URL(request.url).searchParams.get("kind");
    const items = (db().events[params.id] ?? []).filter((e) => !kind || e.kind === kind);
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.get("/v1/protocols/{id}/admin-queue", async ({ params }) => {
    await delay(LAT);
    return HttpResponse.json((db().adminQueue[params.id] ?? []).filter((a) => a.status === "queued"));
  }),
  http.get("/v1/protocols/{id}/settings", ({ params }) => HttpResponse.json(db().settings[params.id] ?? { thresholds: {}, alerts: {}, autoTighten: true })),
  http.patch("/v1/protocols/{id}/settings", async ({ params, request }) => {
    await delay(LAT * 2);
    const body = await request.json();
    const s = db();
    const cur = s.settings[params.id] ?? {};
    s.settings[params.id] = { ...cur, ...body, thresholds: { ...cur.thresholds, ...body.thresholds }, alerts: { ...cur.alerts, ...body.alerts } };
    save();
    return HttpResponse.json(s.settings[params.id]!);
  }),

  /**
   * Mock-only stand-in for an on-chain transaction (guardian cancel / outflow release). Not part of
   * the API: against the real backend the wallet sends the tx and the monitor records the event.
   */
  http.untyped.post("*/__mock/chain/:action", async ({ request, params }) => {
    await delay(800);
    const body = (await request.json()) as { protocolId: string; id: string };
    const s = db();
    if (params.action === "cancel") {
      const a = (s.adminQueue[body.protocolId] ?? []).find((x) => x.id === body.id);
      if (a) {
        a.status = "cancelled";
        (s.events[body.protocolId] ??= []).unshift({ id: crypto.randomUUID(), kind: "admin_cancelled", txHash: a.txHash, invariantId: "tier2Timelock", asset: null, amount: null, data: { function: a.functionName, actionId: a.actionId }, ts: new Date().toISOString() });
      }
    } else if (params.action === "release") {
      const e = (s.events[body.protocolId] ?? []).find((x) => x.id === body.id);
      if (e) {
        (e.data as Record<string, unknown>).released = true;
        (s.events[body.protocolId] ??= []).unshift({ ...e, id: crypto.randomUUID(), kind: "released", ts: new Date().toISOString(), data: { ...(e.data as object), reason: "guardian" } });
      }
    }
    save();
    return HttpResponse.json({ ok: true, txHash: `0x${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}` });
  }),
];
