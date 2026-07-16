# Database and RLS Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PostgreSQL the authoritative boundary for booking workflow, pricing, reviews, storage, deletion, public projections, and privileged functions.

**Architecture:** Keep the existing loose SQL migration chain, repair the fresh-install break in v8, and add one rerunnable v10 corrective migration for deployed databases. Exercise the chain against an isolated local Supabase database with SQL assertions that impersonate anon, authenticated, and service-role actors.

**Tech Stack:** PostgreSQL/Supabase SQL, Row Level Security, PL/pgSQL, Supabase CLI 2.109.1, `psql`.

## Global Constraints

- Repository-only: do not link, push, or execute against a remote Supabase project.
- Preserve all existing frontend/color work and make no visual changes.
- The live upgrade mechanism is `supabase/v10-security-hardening.sql`; historical edits only make a fresh install runnable.
- Booking totals use `round(subtotal * 0.10)` for the 10% service fee.
- Storage remains public-read, image-only, at most 5 MB per object and 100 objects per user.
- Public projections expose no owner, reviewer, or booking UUIDs.
- Add no server or database extensions beyond those already supplied by local Supabase.

---

### Task 1: Add the local migration harness and repair the v8 relation drop

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/tests/apply-all.sql`
- Modify: `supabase/v8-polish.sql:28-35`
- Test: `supabase/tests/apply-all.sql`

**Interfaces:**
- Produces: a local database on `postgresql://postgres:postgres@127.0.0.1:54322/postgres` with v1-v10 applied twice where rerunnability matters.
- Consumed by: Task 5 and the runtime/CI plan's `database-security` job.

- [ ] **Step 1: Write the fresh-chain test runner**

Create `supabase/config.toml`:

```toml
project_id = "gathr-security"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 17

[studio]
enabled = false
```

Create `supabase/tests/apply-all.sql`:

```sql
\set ON_ERROR_STOP on
\ir ../schema.sql
\ir ../host-schema.sql
\ir ../v2-schema.sql
\ir ../v3-schema.sql
\ir ../v4-schema.sql
\ir ../v5-schema.sql
\ir ../v6-performance.sql
\ir ../v7-hardening.sql
\ir ../v8-polish.sql
\ir ../v9-public-views.sql
\ir ../v10-security-hardening.sql
\ir ../v10-security-hardening.sql
\ir ./security-regression.sql
```

- [ ] **Step 2: Run the chain and verify the existing failure**

Run:

```bash
npm exec supabase start
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/apply-all.sql
```

Expected before the repair: PostgreSQL rejects `DROP MATERIALIZED VIEW public.venue_review_stats` because v6 created a normal view. The later missing-v10 error is not the expected first failure.

- [ ] **Step 3: Replace the two unsafe drops in v8**

Use a catalog-dispatched drop that handles only the two supported relation kinds:

```sql
do $$
declare
  relation_kind "char";
begin
  select c.relkind
    into relation_kind
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = 'venue_review_stats';

  if relation_kind = 'm' then
    execute 'drop materialized view public.venue_review_stats';
  elsif relation_kind = 'v' then
    execute 'drop view public.venue_review_stats';
  elsif relation_kind is not null then
    raise exception 'public.venue_review_stats has unsupported relkind %', relation_kind;
  end if;
end $$;
```

- [ ] **Step 4: Run through v9 and commit**

Run the command from Step 2 again. Expected: every script through v9 completes and `psql` stops only because the not-yet-created `v10-security-hardening.sql` include is missing. Then commit:

```bash
git add supabase/config.toml supabase/tests/apply-all.sql supabase/v8-polish.sql
git commit -m "test: add local Supabase migration harness"
```

Expected: v1-v9 completes without a relation-kind error.

---

### Task 2: Lock privileged functions and profile roles in v10

**Files:**
- Create: `supabase/v10-security-hardening.sql`
- Create: `supabase/tests/security-regression.sql`
- Test: `supabase/tests/security-regression.sql`

**Interfaces:**
- Produces: `public.erase_message_bodies(uuid, boolean)` self-scoped RPC and trigger-only `public.handle_new_user()`.
- Produces: private helpers under schema `private`; the schema is not an exposed PostgREST API schema.
- Consumed by: Tasks 3-5.

- [ ] **Step 1: Write failing privilege assertions**

Start `security-regression.sql` with a transactional assertion helper and these checks:

```sql
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then
    raise exception 'security assertion failed: %', message;
  end if;
end $$;

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.erase_message_bodies(uuid,boolean)', 'EXECUTE'),
  'anon can execute erase_message_bodies'
);
select pg_temp.assert_true(
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'authenticated can execute trigger-only handle_new_user'
);
select pg_temp.assert_true(
  coalesce((select proconfig @> array['search_path='] from pg_proc where oid = 'public.erase_message_bodies(uuid,boolean)'::regprocedure), false),
  'erase_message_bodies does not pin an empty search_path'
);
```

Append `rollback;` at the end of the file and run the Task 1 command.

Expected: at least the anon execution and search-path assertions fail against v8.

- [ ] **Step 2: Create v10's privilege preamble and private schema**

Begin v10 with:

```sql
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter default privileges in schema public revoke execute on functions from public;
revoke execute on all functions in schema public from public, anon, authenticated;

drop trigger if exists reviews_refresh_stats on public.reviews;
drop trigger if exists reviews_refresh_review_stats_insert on public.reviews;
drop trigger if exists reviews_refresh_review_stats_update on public.reviews;
drop trigger if exists reviews_refresh_review_stats_delete on public.reviews;
drop function if exists public.refresh_venue_review_stats();
drop function if exists public.refresh_review_stats();
```

- [ ] **Step 3: Replace the two security-definer functions**

Use these complete bodies:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, left(new.raw_user_meta_data ->> 'full_name', 120), 'gatherer')
  on conflict (id) do update
    set full_name = excluded.full_name,
        updated_at = pg_catalog.now();
  return new;
end $$;

create or replace function public.erase_message_bodies(
  p_user_id uuid,
  p_hard_delete boolean default false
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected int;
  caller_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if caller_role <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'message erasure is limited to the current user' using errcode = '42501';
  end if;
  if p_hard_delete and caller_role <> 'service_role' then
    raise exception 'hard deletion requires service role' using errcode = '42501';
  end if;

  if p_hard_delete then
    delete from public.messages where sender_id = p_user_id;
  else
    update public.messages
       set body = '[deleted]', updated_at = pg_catalog.now()
     where sender_id = p_user_id;
  end if;
  get diagnostics affected = row_count;
  return affected;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.erase_message_bodies(uuid, boolean) from public, anon;
grant execute on function public.erase_message_bodies(uuid, boolean) to authenticated, service_role;
```

- [ ] **Step 4: Freeze profile roles**

Create `public.guard_profile_role()` as a fixed-search-path trigger that raises SQLSTATE `42501` whenever `new.role` differs from `old.role` and `auth.jwt()->>'role'` is not `service_role`. Recreate `profiles_role_guard` as `BEFORE UPDATE OF role`, and grant no direct function execution. Keep `profiles: update own` so users may still update `full_name`.

- [ ] **Step 5: Run the SQL assertions and commit**

Run the Task 1 command. Expected: the privilege assertions pass and the next not-yet-written booking assertion becomes the failure point.

```bash
git add supabase/v10-security-hardening.sql supabase/tests/security-regression.sql
git commit -m "fix: lock database security functions"
```

---

### Task 3: Make booking price, state, and deletion database-authoritative

**Files:**
- Modify: `supabase/v10-security-hardening.sql`
- Modify: `supabase/tests/security-regression.sql`
- Test: `supabase/tests/security-regression.sql`

**Interfaces:**
- Produces: `public.prepare_booking()` before-insert trigger.
- Produces: `public.guard_booking_write()` before-update trigger.
- Produces columns: `public.bookings.deleted_at timestamptz`, `public.venues.deleted_at timestamptz`.
- Consumed by: API/auth plan booking and venue routes.

- [ ] **Step 1: Add failing actor and pricing cases**

Insert fixed users, a live hourly venue priced at 1,000 PHP, and a requested booking under an authenticated guest claim. Assert that a submitted `total_php = 1` becomes `4,400`, then impersonate the guest and attempt `requested -> confirmed` inside a PL/pgSQL exception block. The test must raise if the update succeeds. Add the same assertion for a forged per-head booking and for an over-capacity booking.

Use fixed claims in every actor block:

```sql
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
```

Expected before implementation: the forged total remains `1` or the guest confirmation succeeds.

- [ ] **Step 2: Add soft-delete columns and canonical insert trigger**

Add both columns with `ADD COLUMN IF NOT EXISTS`. Replace the old booking immutable/status triggers with one `BEFORE UPDATE` guard, and create this insert derivation:

```sql
create or replace function public.prepare_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  venue public.venues%rowtype;
  subtotal bigint;
begin
  select * into venue
    from public.venues
   where id = new.venue_id
     and status = 'live'
     and deleted_at is null;
  if not found then
    raise exception 'venue is unavailable' using errcode = '23503';
  end if;
  if new.hours is null or new.hours < 1 or new.hours > 168 then
    raise exception 'hours must be between 1 and 168' using errcode = '23514';
  end if;
  if new.guests is not null and (new.guests < 1 or new.guests > venue.capacity) then
    raise exception 'guest count exceeds venue capacity' using errcode = '23514';
  end if;
  if venue.price_unit = 'head' and new.guests is null then
    raise exception 'guest count is required for per-head pricing' using errcode = '23514';
  end if;
  if venue.price_unit <> 'hour' and venue.included_hours is not null
     and new.hours <> venue.included_hours then
    raise exception 'hours must match the included duration' using errcode = '23514';
  end if;

  subtotal := venue.price_per_hour::bigint * case venue.price_unit
    when 'hour' then new.hours
    when 'head' then new.guests
    else 1
  end;
  new.venue_name := venue.name;
  new.status := 'requested';
  new.total_php := subtotal + pg_catalog.round(subtotal * 0.10)::bigint;
  return new;
end $$;
```

Change `bookings.total_php` to `bigint`. Bound venue capacity to 100,000 and `price_per_hour` to 100,000,000 so the maximum 11,000,000,000,000 PHP total remains below JavaScript's safe-integer ceiling. Attach `prepare_booking` as `BEFORE INSERT ON public.bookings`, revoke direct execution from PUBLIC/anon/authenticated, and retain trigger execution.

- [ ] **Step 3: Enforce actor-aware updates**

`public.guard_booking_write()` must freeze identity/event/pricing fields. For authenticated actors it permits exactly:

```text
guest: requested -> cancelled, with deleted_at either unchanged or set
host: requested -> confirmed|declined|cancelled; confirmed -> completed|cancelled; declined -> cancelled
service_role: any transition that still satisfies bookings_status_chk
```

It rejects `deleted_at` changes unless the resulting status is `cancelled`, and rejects any write by a caller who is neither guest nor venue owner. Recreate the booking insert policy as `TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'requested' AND deleted_at IS NULL)` because the fixed-search-path `prepare_booking` trigger now performs the live-venue validation. Recreate the guest and host update policies with `TO authenticated`, existing ownership checks, and `deleted_at IS NULL` in `USING`.

- [ ] **Step 4: Replace destructive parent cascades**

Drop and recreate the booking/venue/conversation/message/review foreign keys that can erase another party's content with `ON DELETE RESTRICT`. Keep user-owned `profiles` and `saved_venues` cleanup cascades. Drop the user-facing DELETE policies on venues and bookings; users archive through updates.

- [ ] **Step 5: Run the actor tests and commit**

Run the Task 1 command. Expected: canonical totals, capacity checks, guest denial, valid host transitions, and restricted hard deletes all pass.

```bash
git add supabase/v10-security-hardening.sql supabase/tests/security-regression.sql
git commit -m "fix: enforce booking invariants in Postgres"
```

---

### Task 4: Harden reviews, public projections, field limits, storage, and latest messages

**Files:**
- Modify: `supabase/v10-security-hardening.sql`
- Modify: `supabase/tests/security-regression.sql`
- Test: `supabase/tests/security-regression.sql`

**Interfaces:**
- Produces views: `public.venues_live`, `public.reviews_public`, `public.venue_review_stats`.
- Produces RPC: `public.latest_messages(p_thread_kind text, p_thread_ids uuid[])`.
- Produces trigger: `public.prepare_review()`.
- Consumed by: API/auth plan venue, review, and message routes.

- [ ] **Step 1: Add failing projection, review, storage, and RPC assertions**

Assert through `information_schema.columns` that `reviews_public` omits `booking_id` and `user_id`, and `venues_live` omits `owner_id`. Assert `venue_review_stats` has `relkind = 'v'`, no review-refresh trigger exists, and a forged review author becomes the profile name. Insert two messages per thread and assert `latest_messages` returns one row per authorized thread. Assert the storage insert policy contains the owner-path and quota helper.

- [ ] **Step 2: Replace materialized stats and public views**

Use the same catalog-dispatched drop from Task 1 for `venue_review_stats`, then create three `security_barrier` views. Their predicates and columns are exact:

```sql
create view public.venues_live with (security_barrier = true) as
select id, name, city, area, types, capacity, price_per_hour, blurb,
       amenities, image_urls, host_name, host_type, price_unit,
       included_hours, status, created_at, updated_at
  from public.venues
 where status = 'live' and deleted_at is null;

create view public.reviews_public with (security_barrier = true) as
select r.id, r.venue_id, r.author_name, r.rating, r.body,
       r.created_at, r.updated_at
  from public.reviews r
  join public.venues v on v.id = r.venue_id
 where v.status = 'live' and v.deleted_at is null;

create view public.venue_review_stats with (security_barrier = true) as
select r.venue_id, count(*)::int as count,
       avg(r.rating)::numeric(3,2) as avg
  from public.reviews r
  join public.venues v on v.id = r.venue_id
 where v.status = 'live' and v.deleted_at is null
 group by r.venue_id;
```

Remove the public-read RLS policies from base venues/reviews. Add authenticated owner/reviewer SELECT policies, revoke anon base SELECT, retain authenticated base SELECT under RLS, and grant both roles only the three public views.

- [ ] **Step 3: Derive review identity**

Create `public.prepare_review()` as a fixed-search-path `BEFORE INSERT` trigger. It loads the booking by `new.booking_id`, requires the caller to be its guest, requires `status='confirmed'` and a past/current `event_date`, then sets `new.user_id`, `new.venue_id`, and `new.author_name` from `profiles.full_name` with fallback `Gathr member`. Keep booking, venue, user, and author immutable on update.

- [ ] **Step 4: Add bounded field constraints**

Create immutable `private.text_array_within(text[], int, int)` and `private.url_array_within(text[], int)` SQL helpers. Add `NOT VALID` checks enforcing the approved limits: names 120, venue name/area 160, city/event type 120, note 2,000, blurb/message 5,000, review 4,000, types 12x60, amenities 50x100, image URLs 20x2,048 with `https?://` prefixes, capacity 1..100,000, price 0..100,000,000, and included hours 1..168. Grant helper execution to authenticated and service_role because inserts evaluate the checks under the caller.

- [ ] **Step 5: Enforce a race-safe storage quota**

Create `private.can_upload_venue_photo()` as `VOLATILE SECURITY DEFINER SET search_path=''`. It obtains `pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0))` and returns whether the caller owns fewer than 100 objects in `venue-photos`. Recreate the insert policy to require authenticated role, matching first folder segment, and this helper. Keep delete owner-only and public read.

- [ ] **Step 6: Add the bounded latest-message RPC**

Create a `STABLE SECURITY INVOKER SET search_path=''` SQL function returning the six message columns. It accepts only `booking_id` or `conversation_id`, caps `cardinality(p_thread_ids)` at 200, filters by the selected UUID column, and uses `DISTINCT ON (thread_id) ... ORDER BY thread_id, created_at DESC, id DESC`. Revoke PUBLIC/anon execution and grant authenticated execution. Underlying message RLS remains the authorization boundary.

- [ ] **Step 7: Run all database tests and commit**

End `v10-security-hardening.sql` with `commit;`. Run the Task 1 command twice against a clean local stack. Expected: `security-regression.sql` reaches `rollback` with no raised assertion and v10's second application succeeds.

```bash
git add supabase/v10-security-hardening.sql supabase/tests/security-regression.sql
git commit -m "fix: harden public database surfaces"
```

---

### Task 5: Document the canonical database path

**Files:**
- Modify: `docs/database.md`
- Modify: `docs/getting-started.md`
- Modify: `docs/ops.md`
- Modify: `docs/release-checklist.md`
- Modify: `supabase/v9-review-stats-materialized.sql`

- [ ] **Step 1: Mark the alternate v9 script superseded**

Replace its executable body with a header directing operators to `v9-public-views.sql` then `v10-security-hardening.sql`; do not leave a second migration head that can recreate the unsafe refresh trigger.

- [ ] **Step 2: Update all ledgers and deployment checks**

Document one order through v10, the v10 preflight/backup/staging sequence, the soft-delete behavior, public projections, storage quota, canonical pricing, and this local verification command:

```bash
npm exec supabase start
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/apply-all.sql
npm exec supabase stop
```

- [ ] **Step 3: Verify documentation and commit**

Run `rg -n "v9-review-stats-materialized|v1.*v9|on delete cascade|author_name.*displayName" docs supabase` and resolve every stale operational claim.

```bash
git add docs/database.md docs/getting-started.md docs/ops.md docs/release-checklist.md supabase/v9-review-stats-materialized.sql
git commit -m "docs: publish the v10 database runbook"
```
