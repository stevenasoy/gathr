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
- **api**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN` (comma-separated allowlist, no wildcard), `NODE_ENV`, `PORT`

The API **service-role key bypasses RLS** — keep it server-only, never in the web bundle, never behind a public route. Public routes use the caller's JWT (see `apps/api/src/middleware/auth.js`).

## Schema migrations

Migrations are loose SQL files applied in order via the Supabase SQL Editor (no CLI runner yet):

```
schema.sql → host-schema.sql → v2-schema.sql → v3-schema.sql → v4-schema.sql → v5-schema.sql
```

`v5-schema.sql` is a production hardening migration. Read its header comments first — it includes pre-flight queries and uses `NOT VALID` CHECK constraints so it won't fail on historical dirty rows. After applying, run `validate constraint` on each CHECK once the data is clean.

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