# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gathr is a two-sided marketplace for booking **event venues** (weddings, corporate offsites, parties, workshops, shoots) in the Philippines. The two sides are **Host** (lists venues) and **Gatherer** (books them). Prices are in PHP (₱).

## Monorepo structure

```
apps/web/      → Main React frontend (@gathr/web)
apps/api/      → Express backend API (@gathr/api)
apps/demo/     → Interactive 3D demo (@gathr/demo)
packages/shared/ → Shared utilities (@gathr/shared)
supabase/      → Database schemas
docs/          → All documentation (see index below)
```

## Commands

```bash
npm run dev        # Web app → http://localhost:5173
npm run dev:api    # API server → http://localhost:3001
npm run dev:demo   # Interactive demo
npm run build      # Build web app
npm run build:all  # Build all apps
npm run lint       # ESLint (web app only)
```

No test suite — verify with `npm run lint` + `npm run build` + `npm run test:ci`. The web + API apps are TypeScript (`strict: true`); `npm run build` runs `tsc` as the type-check gate (web: `tsc --noEmit && vite build`; api: `tsc` emits to `apps/api/dist`, dev via `tsx`). Supabase row types are hand-written in `apps/web/src/types/db.ts` (+ `apps/api/src/types/db.ts`); app-domain types in `apps/web/src/types/index.ts`. The schema lives in `supabase/` as versioned SQL files (`schema.sql` → `host-schema.sql` → `v2` → `v3` → `v4` → `v5`); apply in order via the Supabase SQL Editor. See `docs/ops.md` for migrations, CI, and deploy.

## Documentation index

Detailed docs are split by topic in `docs/`. **Read only the file you need:**

| Topic | File | When to read |
|---|---|---|
| Context providers & state | [docs/contexts.md](docs/contexts.md) | Touching any context, state management, or provider ordering |
| Data layer & lib functions | [docs/data-layer.md](docs/data-layer.md) | Working with Supabase calls, venue/booking/message helpers |
| Venue data shape | [docs/venue-shape.md](docs/venue-shape.md) | Adding/editing venue fields, rendering venue data |
| Host features | [docs/host-features.md](docs/host-features.md) | Onboarding wizard, dashboard, edit form, host model |
| Booking & messaging | [docs/booking-messaging.md](docs/booking-messaging.md) | Booking detail, messages, conversations, threads |
| Database & RLS | [docs/database.md](docs/database.md) | Schema changes, RLS policies, Supabase config |
| Styling | [docs/styling.md](docs/styling.md) | CSS, brand colors, fonts, design tokens |
| Vocabulary | [docs/vocabulary.md](docs/vocabulary.md) | UI copy, role naming conventions |
| Gotchas & pitfalls | [docs/gotchas.md](docs/gotchas.md) | Icons, lazy routes, HMR, env vars, known quirks |
| Getting started | [docs/getting-started.md](docs/getting-started.md) | Dev environment setup |
| API reference | [docs/api-reference.md](docs/api-reference.md) | Backend API endpoints |
| Ops & release | [docs/ops.md](docs/ops.md) | Deploy, env, CI/branch protection, migrations, backups, incident runbook |
| Contributing | [docs/contributing.md](docs/contributing.md) | Branch strategy, code style |

## Environment

`.env` files live in each app (gitignored). See `apps/web/.env.example` and `apps/api/.env.example`.
Vite only reads `.env` at startup — **restart the dev server after editing it**.
