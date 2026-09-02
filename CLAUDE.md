# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reply length (hard rule)

Replies to Steven are **concise and direct, not truncated.** Keep the substance. Cut the padding. Short is not the goal, tight is: he still needs the right answer in full.

- Answer first. No preamble, no restating the question.
- Grade 5 English. Short sentences, plain words.
- Cut what he already knows: no recap of work the tool calls just showed, no summary table, no closing offer to do more.
- Keep what changes his decision: the finding, the number, the trade-off, the risk.
- Reasoning only when it changes what he does.
- One question at a time.
- Aim under 100 words. Go longer when the answer needs it, and make every extra line carry new information.
- **Never create a file to dodge length.** Files only when Steven asks for one or it is a reusable asset.

Full rule: `~/.claude/CLAUDE.md`. (Steven, 2026-07-29, 2026-08-17.)

---

## What this is

Gathr (folder `weGathr/`, brand wordmark "weGathr") is a two-sided marketplace for booking **event venues** (weddings, corporate offsites, parties, workshops, shoots) in the Philippines. The two sides are **Host** (lists venues) and **Gatherer** (books them). Prices are in PHP (₱).

**Where it sits in the StevenAI workspace:** Steven's own product side project (started 2026-06-09), its own GitHub repo (`stevenasoy/gathr`, last commit 2026-07-27). It is a side project with no revenue role and no client. It shares nothing with `steven/lean-operator/`; do not route Gathr code, brand, or data into TLO folders or the reverse. Workspace rules still apply: no em dashes in copy, anti-AI-slop on every output, ground every claim.

## Monorepo structure (rescanned 2026-08-18)

```
apps/web/          → Main React frontend (@gathr/web), Vite + TS strict
apps/api/          → Express backend API (@gathr/api), TS, tsx in dev
apps/demo/         → Interactive 3D demo (@gathr/demo, Three.js)
packages/shared/   → Shared utilities (@gathr/shared)
supabase/          → Versioned schema SQL, seed, tests/ (apply-all, security-regression)
docs/              → All documentation (see index below), plus AUDIT-2026-07-12.md and release-checklist.md
e2e/               → Playwright specs (smoke, responsive), playwright.config.ts at root
brand/             → weGathr wordmark SVGs (five colourways) + README. Wordmark only, no icon.
decks/             → host-pitch-deck.html
video-ad/          → Remotion project for the product video (GathrAd, GathrStory, capture scripts)
.claude/skills/    → performance-optimization, security-and-hardening
.agents/skills/    → design-taste skill pack (brandkit, high-end-visual-design, minimalist-ui, and others)
.superpowers/sdd/  → spec-driven-development task reports
dist/, test-results/ → build and test output, disposable
```

## Commands

```bash
npm run dev        # Web + API together (concurrently) → web http://localhost:5173, API http://localhost:3001
npm run dev:web    # Web only
npm run dev:api    # API only
npm run dev:demo   # Interactive demo
npm run build      # Build web app (tsc --noEmit && vite build)
npm run build:api  # Build API (tsc → apps/api/dist)
npm run build:all  # Build all workspaces
npm run typecheck  # web + api tsc gates
npm run lint       # ESLint (web app only)
npm run test       # Vitest, web + api (watch)
npm run test:ci    # Vitest run, web + api
npm run test:e2e   # Playwright (e2e/)
```

Verify a change with `npm run lint` + `npm run typecheck` + `npm run test:ci`, and `npm run test:e2e` when the UI moved. Unit tests exist for the web lib (`apps/web/src/lib/__tests__/`) and the API (`apps/api/src/*.test.ts`); coverage is thin, so add a test next to what you change. Supabase row types are hand-written in `apps/web/src/types/db.ts` (+ `apps/api/src/types/db.ts`); app-domain types in `apps/web/src/types/index.ts`.

**Schema:** `supabase/` holds versioned SQL applied in order via the Supabase SQL Editor: `schema.sql` → `host-schema.sql` → `v2` → `v3` → `v4` → `v5` → `v6-performance` → `v7-hardening` → `v8-polish` → `v9-public-views` → `v9-review-stats-materialized` → `v10-security-hardening`. Read each file's header before applying; `v5` and `v9-public-views` have ordering constraints. `supabase/tests/apply-all.sql` runs the chain, `security-regression.sql` checks the RLS posture. `docs/ops.md` covers migrations, CI, and deploy; **its chain list stops at v9 and needs v9-review-stats and v10 added.**

**Known state:** `docs/AUDIT-2026-07-12.md` found the pre-launch posture weak (sessions in localStorage, permissive RLS on bookings/conversations, no dependency gate, N+1 on messages `/latest`). v7 to v10 and the API hardening addressed parts of it; re-read the audit before calling anything production-ready.

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
Vite only reads `.env` at startup, so **restart the dev server after editing it**.
