# Release checklist

Use this before deploying to staging or production after a fresh clone or after schema changes.

## Environment setup

- [ ] `apps/web/.env` - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] `apps/api/.env` - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ORIGIN`, `WEB_ORIGIN`, `SUPABASE_WS_URL`, `TRUST_PROXY_HOPS`, `RATE_LIMIT_REDIS_URL`, `NODE_ENV=production`, `PORT=3001`

Get `SUPABASE_JWT_SECRET` from Supabase Dashboard -> Project Settings -> API -> JWT Settings.

## Supabase schema (apply in order via SQL Editor)

Run each file once, in order, against the target project:

1. `supabase/schema.sql`
2. `supabase/host-schema.sql`
3. `supabase/v2-schema.sql`
4. `supabase/v3-schema.sql`
5. `supabase/v4-schema.sql`
6. `supabase/v5-schema.sql`
7. `supabase/v6-performance.sql`
8. `supabase/v7-hardening.sql`
9. `supabase/v8-polish.sql`
10. `supabase/v9-public-views.sql`
11. `supabase/v10-security-hardening.sql`

After `v5`, run `validate constraint` for each `NOT VALID` CHECK once data is clean.

## Auth settings

In Supabase Dashboard -> Authentication -> Sessions:

- [ ] Access token (JWT) expiry: **1 hour** (3600 seconds)
- [ ] Refresh token expiry: **30 days**

This matches the `gathr.access_token` and `gathr.refresh_token` cookie lifetimes set by `apps/api/src/lib/cookies.ts`.

## Pre-deploy verification

```bash
npm ci
npm run lint
npm run build
npm run build:api
npm run test:ci
```

All must pass.

## Post-deploy verification

- [ ] `GET /api/health` returns 200
- [ ] `POST /api/auth/signin` sets `gathr.access_token` and `gathr.refresh_token` cookies
- [ ] `GET /api/auth/session` with cookies returns the user
- [ ] `GET /api/venues` returns public listings without `owner_id`
- [ ] `GET /api/reviews/venue/:id` returns reviews without `user_id`
- [ ] `POST /api/auth/signout` clears both cookies

## Required CI checks

- [ ] web
- [ ] api
- [ ] docker
- [ ] audit
- [ ] database-security
- [ ] codeql
- [ ] repository-security
- [ ] E2E remains optional until its test-project secrets exist
