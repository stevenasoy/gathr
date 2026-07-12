# Ops & Release

Runbook for deploying and operating Gathr in production.

## Environments

| Env | Purpose | Supabase project | Notes |
|---|---|---|---|
| local | dev | throwaway | `supabase/seed.sql` after schema v1–v5 |
| staging | pre-prod validation | separate project | apply migrations here first |
| production | live | prod project | PITR enabled (see Backups) |

Each app reads env from its own `.env` (gitignored). Required keys:

- **web**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **api**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ORIGIN` (comma-separated allowlist, no wildcard), `NODE_ENV`, `PORT`

The API **service-role key bypasses RLS** — keep it server-only, never in the web bundle, never behind a public route. Public routes use the caller's JWT (see `apps/api/src/middleware/auth.js`).

### Auth cookies

Auth is proxied through `/api/auth/*`. The API sets two httpOnly cookies:
- `gathr.access_token` — short-lived (1h), used by the API to identify requests.
- `gathr.refresh_token` — long-lived (30d), restricted to `/api/auth`, used to mint new access tokens server-side.

The refresh token **never reaches browser JavaScript**. Configure Supabase Auth token lifetimes to match (Dashboard → Authentication → Sessions): access token 3600s, refresh token 30 days. The web SPA keeps only a short-lived access token in memory for direct Supabase calls (realtime subscriptions, saved venues); it is lost on page reload and restored via `GET /api/auth/session`.

`SUPABASE_JWT_SECRET` is required for local JWT verification (removes the per-request auth-service network hop). Copy it from Supabase Dashboard → Project Settings → API → JWT Settings.

### Content-Security-Policy

Do **not** rely on the `index.html` meta tag for CSP in production. The repo ships no meta CSP because it blocks Vite dev HMR and Google Fonts. Enforce CSP via the production server/edge response header. A starting policy is in `apps/web/Dockerfile` / nginx config (add `Content-Security-Policy` header matching your origins and Supabase project ref).

## Schema migrations

Migrations are loose SQL files applied in order via the Supabase SQL Editor (no CLI runner yet):

```
schema.sql → host-schema.sql → v2-schema.sql → v3-schema.sql → v4-schema.sql → v5-schema.sql → v6-performance.sql → v7-hardening.sql → v8-polish.sql → v9-public-views.sql
```

`v5-schema.sql` is a production hardening migration. Read its header comments first — it includes pre-flight queries and uses `NOT VALID` CHECK constraints so it won't fail on historical dirty rows. After applying, run `validate constraint` on each CHECK once the data is clean.

`v8-polish.sql` is Phase 3 performance polish: materialized review stats, index cleanup/additions, and the `profiles` table. It is safe to re-run.

`v9-public-views.sql` strips `owner_id` from public venue reads and `user_id` from public review reads. Apply it **after** the API is deployed and using `venues_live` / `reviews_public`; it revokes anon SELECT on the base `venues` and `reviews` tables.

Apply migrations to **staging first**, verify, then production. Keep the apply order — each file may `drop` and recreate policies from a prior file.

## Backups

Supabase: enable **Point-in-Time Recovery** (PITR) on the production project (Pro plan+). Verify a restore in staging on a monthly cadence. The schema's `on delete cascade` FKs (added in v5) mean a deleted venue removes its bookings/conversations/reviews/saved rows — back up before bulk venue operations.

## CI

`.github/workflows/ci.yml` runs on every PR/push to `main`:
- web: lint + build + vitest
- api: vitest (supertest)
- docker: both images build
- e2e: Playwright (optional — gated on `E2E_*` secrets; `continue-on-error`)

**Branch protection** (configure in GitHub repo settings → Branches): require the `web` + `api` + `docker` checks to pass before merge to `main`; require PR reviews; forbid force-push.

## Incident runbook (skeleton)

1. **Detect** — error spike via logs / user reports.
2. **Triage** — check `/api/health` (api), app load (web), Supabase project status page.
3. **Mitigate** — rollback the last deploy (redeploy previous image tag); disable the offending feature flag / route.
4. **Communicate** — post to the incident channel; update status page if user-facing.
5. **Resolve** — fix on a branch, run CI, deploy.
6. **Postmortem** — within 48h: timeline, root cause, action items filed as issues.

## Deploy

`docker compose up --build` builds and runs web (nginx :5173) + api (:3001) with healthchecks. For platform deploys (Fly/Railway/Render/Cloud Run), use the per-app Dockerfiles and set the env vars above. The web image serves static files behind nginx with CSP/HSTS/X-Frame-Options; the api image exposes `/api/health` for readiness probes.