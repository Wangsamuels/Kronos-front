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

MSW intercepts every `/v1/*` call. The handlers are typed from the same `contracts/openapi.json`, and a scripted SSE run plays the full analysis. Mock state lives in `localStorage` (`kronos.mock.v4`); clear it to start over. A small "mock api" badge shows in the corner.

Try these:
- **Connect → "or use the MiniLend sample"** (`sample://minilend`) → Continue with GitHub (mock) → Start analysis.
- Put **"bridge"** (or any non-lending hint) in the repo: the run fails with `UNSUPPORTED_TYPE` and you get the waitlist (`POST /v1/waitlist`).
- On **Verify**, a guard address ending in `dead` fails the checklist. Any other valid address goes LIVE.
- `/p` already includes a seeded LIVE "MiniLend (sample)" protocol on two chains. Sign in first (the modal's GitHub button signs in the demo user on mocks).

## Run live

Production builds are live by default: `next.config.ts` defaults `NEXT_PUBLIC_API_URL` to `/api` when building for production, so `pnpm build` (and Vercel) talk to the real backend with no dashboard setup. An env var always wins. To build on mocks instead: `NEXT_PUBLIC_API_URL= pnpm build`.

```bash
NEXT_PUBLIC_API_URL=/api pnpm dev      # dev server against the live backend
```

**Everything goes through this site's own origin.** The browser calls `/api/v1/...`; `vercel.json` (on Vercel) and the `rewrites()` in `next.config.ts` (for `next dev` / `next start`) proxy that to the backend. That keeps the refresh cookie first-party, which Safari and Brave require. Two things do not use the proxy:

- **GitHub sign-in** is a full-page navigation to the backend (`providers.github.startUrl`), because GitHub's callback URL points there.
- **The live log (SSE)** connects to `NEXT_PUBLIC_API_DIRECT_URL`, because a proxy can buffer or cut a long-lived stream. Leave it empty locally and the stream uses `/api` too.

The backend must have `FRONTEND_URL` set to this site and the site's origin in `CORS_ORIGINS`. SIWE and NEAR messages are bound to the host in `GET /v1/auth/providers`, so wallet sign-in only works on that host (previews on other hosts need adding to `CORS_ORIGINS`).

To regenerate types from the running backend: `OPENAPI_SRC=https://<backend>/openapi.json pnpm api:gen` (and copy the file to `contracts/openapi.json` so the mocks stay typed against it).

## Sign-in

One modal (`src/components/auth/AuthModal.tsx`) serves sign-up and sign-in. It is built from `GET /v1/auth/providers` and shows only enabled providers; the backend says which happened with `isNewUser`. Dev login never shows in a production build.

| Trigger | Signed out | Signed in |
|---|---|---|
| Paste a repo, press Analyze | Form saved to `sessionStorage['kronos:pending-submit']`, modal opens | Submits straight away |
| "Your protocols" | Modal opens, `returnTo=/p` | Goes to `/p` |
| Any API call still 401 after one refresh | Modal opens, `returnTo` = current path | n/a |

After any successful sign-in, a pending submit is posted to `/v1/protocols` and the new analysis opens.

- **GitHub** returns to `/auth/callback#access_token=…&code=…&return_to=…`. The page clears the fragment and calls `POST /api/v1/auth/exchange {code}`, which sets the refresh cookie on this domain; if that fails it falls back to the fragment's access token.
- **Linking** a second method to the same account: wallet calls carry the bearer token; GitHub and the App install add `linkToken=<accessToken>` to the start URL.

## Auth

- The access JWT lives only in memory (`src/api/auth.ts`). It is refreshed about a minute before it expires while the tab is visible.
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
| `NEXT_PUBLIC_API_URL` | `/api` for the live backend through the proxy. Empty means MSW mocks |
| `NEXT_PUBLIC_API_DIRECT_URL` | Backend origin for the live log (SSE). Empty means same as the API URL |
| `KRONOS_API_ORIGIN` | Server-side: where `/api/*` is proxied. Defaults to the Heroku app |
| `NEXT_PUBLIC_WALLETCONNECT_ID` | Optional. Injected wallets work without it |
| `NEXT_PUBLIC_NEAR_NETWORK` | `testnet` |
| `NEXT_PUBLIC_CHAINS` | `aurora-testnet,base-sepolia` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional. Sentry stays off when empty |
| `NEXT_PUBLIC_GITHUB_URL` | Optional public source link (defaults to `/docs#source`) |

Vercel Analytics only renders on Vercel (`VERCEL` env).
