# Kronos frontend

`kro/nos` is a multi-protocol security layer. Lending ships first. Bridges, DEXs and vaults come later, and those protocol types go to the waitlist for now.

This is a standalone Next.js 15 app (App Router, TypeScript strict, Tailwind tokens, TanStack Query, openapi-fetch, MSW). It talks to the Kronos backend only over HTTP. It contains no backend code.

## Install

```bash
pnpm install
cp .env.example .env.local
pnpm api:gen        # regenerate src/api/schema.d.ts from contracts/openapi.json
pnpm typecheck
```

## Run on mocks (no backend)

Leave `NEXT_PUBLIC_API_URL` empty.

```bash
pnpm dev            # http://localhost:3000
```

MSW intercepts every `/v1/*` call. The handlers are typed from the same `contracts/openapi.json`, and a scripted SSE run plays the full analysis. Mock state lives in `localStorage` (`kronos.mock.v3`); clear it to start over. A small "mock api" badge shows in the corner.

Try these:
- **Connect → "or use the MiniLend sample"** (`sample://minilend`) → Continue with GitHub (mock) → Start analysis.
- Put **"bridge"** (or any non-lending hint) in the repo: the run fails with `UNSUPPORTED_TYPE` and you get the waitlist (`POST /v1/waitlist`).
- On **Verify**, a guard address ending in `dead` fails the checklist. Any other valid address goes LIVE.
- `/p` already includes a seeded LIVE "MiniLend (sample)" protocol, so you can see the dashboard right away.

## Run live

```bash
NEXT_PUBLIC_API_URL=https://<your-backend-host> pnpm dev
```

The backend has to allow this origin. Set `CORS_ORIGINS` to include it (credentials on), and set `FRONTEND_URL` to it, because the GitHub OAuth callback redirects to `FRONTEND_URL/auth/callback#access_token=…`. For SIWE in production, the signed domain is this frontend's host.

To regenerate types from the running backend: `OPENAPI_SRC=<url-or-path-to-openapi.json> pnpm api:gen`.

## Auth

- The access JWT lives only in memory (`src/api/auth.ts`).
- Refresh uses the httpOnly cookie: `POST /v1/auth/refresh` with `credentials: 'include'`. Refreshes are deduplicated, and a 401 is retried once after a refresh.
- EventSource can't set headers, so SSE gets `?token=<jwt>`.

## Live log and resuming after approval

`src/api/stream.ts` keeps one store per run id (in memory and in `sessionStorage['kronos.stream.<runId>']`). It records each event and its numeric SSE `id`, and drops duplicates by id.

Native `EventSource` can't send a `Last-Event-ID` header on a *new* connection. So when we reopen a stream, we put it in the query string:

```
GET /v1/analyses/:runId/stream?token=<jwt>&lastEventId=<last id seen>
```

The backend reads `last-event-id` header ?? `lastEventId` query. It replays only events with a higher id, then keeps streaming live.

The flow:
1. The analysis stream ends at `done` (stage `review`) and closes, because the run is resting.
2. On **Review → Approve and build guard**, after `POST …/approve` succeeds, the client calls `openStream(runId, { resume: true })` with the stored last id. Then it navigates back to `/p/[id]/analysis`.
3. Packaging continues **on the same analysis id**. The log shows "Review approved…", the package builder lines, and finally the `package` done event `{packageId, version, configHash}`. A toast shows which event id it resumed from.
4. If the stream drops mid-run (`onerror`), the client checks the run status. A resting run (review/failed/packaged) is closed. Otherwise it refreshes the token and reopens with `lastEventId`, up to 4 times, then shows "unreachable" with a Retry.

## Screens

| Route | What it does |
|---|---|
| `/` | Homepage: trace replay, how it works, guard flow, admin tiers, protocol types (Lending live, Bridges next), SDK snippet |
| `/connect` | Link the repo and website, GitHub sign-in and app install, EVM (SIWE) or NEAR (NEP-413) wallet, start analysis, waitlist for unsupported types |
| `/p` | Protocol list |
| `/p/[id]/analysis` | Live log (SSE), stage rail, counters, done/failed states, packaging follow-up |
| `/p/[id]/review` | Invariants, intents, admin tiers, test report and gas, approve |
| `/p/[id]/integrate` | Open a PR or download the zip, diff preview, SDK and forge deploy snippets |
| `/p/[id]/verify` | Deployment checklist, then LIVE |
| `/p/[id]` | Dashboard: blocked, outflow queue, released, attestation age, needs-attention queue (cancel timelock, release outflow via wagmi), activity, config |
| `/p/[id]/settings` | Thresholds, alerts, guardians, danger zone |
| `/auth/callback` | Reads `#access_token` / `#installation_id` |
| `/docs` | Integration docs |

Every data view has loading skeletons, an empty state, an error state with Retry, and a stale state.

## Env

| Var | Meaning |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL. Empty means MSW mocks |
| `NEXT_PUBLIC_WALLETCONNECT_ID` | Optional. Injected wallets work without it |
| `NEXT_PUBLIC_NEAR_NETWORK` | `testnet` |
| `NEXT_PUBLIC_CHAINS` | `aurora-testnet,base-sepolia` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional. Sentry stays off when empty |
| `NEXT_PUBLIC_GITHUB_URL` | Optional public source link (defaults to `/docs#source`) |

Vercel Analytics only renders on Vercel (`VERCEL` env).
