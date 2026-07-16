# Getting Started

## Prerequisites

- **Node.js** >= 24
- **npm** >= 9 (ships with Node 18+)
- A **Supabase** project ([supabase.com](https://supabase.com))

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/stevenasoy/gathr.git
cd gathr
```

### 2. Install dependencies

```bash
npm ci
```

This installs dependencies for all workspaces (`apps/web`, `apps/api`, `apps/demo`, `packages/shared`).

### 3. Configure environment variables

```bash
# Web app
cp apps/web/.env.example apps/web/.env

# API server
cp apps/api/.env.example apps/api/.env
```

Fill in your Supabase credentials in each `.env` file.

### 4. Set up the database

Apply the schema files in order in the Supabase SQL Editor. Each is safe to re-run:

```sql
-- Paste and run each file's contents in this exact order:
-- 1. supabase/schema.sql        (core: saved_venues, bookings)
-- 2. supabase/host-schema.sql   (venues, host booking policies, double-book guard)
-- 3. supabase/v2-schema.sql     (listing status, messages, realtime)
-- 4. supabase/v3-schema.sql     (conversations, pre-booking inquiries)
-- 5. supabase/v4-schema.sql     (storage bucket, reviews)
-- 6. supabase/v5-schema.sql     (prod hardening: FKs, RLS WITH CHECK, status transitions, updated_at, indexes)
```

`v5-schema.sql` is a production hardening migration. Read its header comments — it includes pre-flight queries to run first (it aborts cleanly if `venue_id` columns contain non-uuid values) and uses `NOT VALID` CHECK constraints so it won't fail on historical dirty rows. After applying, optionally run `validate constraint` on each CHECK once the data is clean.

### 5. Start developing

```bash
# Web + API together (http://localhost:5173 + http://localhost:3001)
npm run dev

# Web app only (http://localhost:5173)
npm run dev:web

# API server only (http://localhost:3001)
npm run dev:api

# Interactive demo
npm run dev:demo
```

## Available Scripts

| Command             | Description                         |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Start the web app + API together    |
| `npm run dev:web`   | Start the web app only              |
| `npm run dev:api`   | Start the API server only           |
| `npm run dev:demo`  | Start the interactive demo          |
| `npm run build`     | Build the web app              |
| `npm run build:all` | Build all apps                 |
| `npm run lint`      | Lint the web app               |

### Local security checks

```bash
npm exec supabase start
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/apply-all.sql
npm exec supabase stop
```
