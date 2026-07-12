-- Gathr v8: Phase 3 performance + security polish.
-- Run in Supabase SQL Editor AFTER schema.sql → host-schema.sql → v2 → v3 → v4 → v5 → v6 → v7.
-- Safe to re-run (drops + recreates objects idempotently).
--
-- Addresses from the 2026-07-12 audit:
--   M12  - drop duplicate message indexes from v6
--   M13  - materialize venue_review_stats and refresh concurrently
--   M14  - time-based indexes on growth tables
--   M15  - add real selectivity indexes (GIN, city, composites)
--   L11  - index venues.city / partial (city) where status='live'
--   L12  - composite (user_id, created_at desc) for my-* newest-first
--   L13  - drop low-selectivity bookings_status_idx
--   L14  - drop low-selectivity venues_status_idx
--   L15  - index venues.created_at desc where status='live'
--   L16  - public.profiles table + handle_new_user() trigger
--   L28  - set venue_review_stats to security_invoker
--   L29  - document messages immutability + add service-role erasure function

-- ============================================================
-- 1. Drop duplicate / low-value indexes
-- ============================================================
drop index if exists public.messages_booking_created_idx;
drop index if exists public.messages_conversation_created_idx;
drop index if exists public.bookings_status_idx;
drop index if exists public.venues_status_idx;

-- ============================================================
-- 2. Materialize review stats view (M13 + L28)
-- ============================================================
-- Refresh the existing plain view as a materialized view with a unique index.
-- Use a DO block to drop whatever form currently exists without erroring on the
-- wrong object type.
do $$
begin
  execute 'drop view if exists public.venue_review_stats';
exception when sqlstate '42809' then
  -- Object exists but is a materialized view, not a plain view.
  execute 'drop materialized view if exists public.venue_review_stats';
end $$;

create materialized view public.venue_review_stats as
select
  venue_id,
  count(*)::int as count,
  avg(rating)::numeric(3,2) as avg
from public.reviews
group by venue_id;

-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
create unique index if not exists venue_review_stats_pk_idx on public.venue_review_stats (venue_id);
create index if not exists venue_review_stats_avg_idx on public.venue_review_stats (avg desc);

-- Respect caller RLS where supported (PG15+). On older Postgres the parameter
-- does not exist; the aggregate view only exposes venue_id/count/avg anyway.
do $$
begin
  execute 'alter materialized view public.venue_review_stats set (security_invoker = true)';
exception when others then
  raise notice 'security_invoker not available on this Postgres version; skipped';
end $$;

-- Auto-refresh on review mutations. SECURITY DEFINER because anon/authenticated
-- need to be able to trigger the refresh without owning the materialized view.
create or replace function public.refresh_venue_review_stats()
returns trigger language plpgsql security definer as $$
begin
  refresh materialized view concurrently public.venue_review_stats;
  return null;
end$$;

drop trigger if exists reviews_refresh_stats on public.reviews;
create trigger reviews_refresh_stats
  after insert or update or delete on public.reviews
  for each statement execute function public.refresh_venue_review_stats();

grant select on public.venue_review_stats to anon, authenticated;

-- ============================================================
-- 3. Time-based and high-selectivity indexes (M14 + L11-L15)
-- ============================================================
-- Bookings: guest / host newest-first, plus event_date range queries.
create index if not exists bookings_user_created_idx on public.bookings (user_id, created_at desc);
create index if not exists bookings_venue_created_idx on public.bookings (venue_id, created_at desc);
create index if not exists bookings_event_date_idx   on public.bookings (event_date);

-- Messages: one index per thread FK (replaces the dropped duplicates).
create index if not exists messages_booking_idx    on public.messages (booking_id, created_at desc);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- Reviews: newest-first per reviewer + venue.
create index if not exists reviews_user_created_idx  on public.reviews (user_id, created_at desc);
create index if not exists reviews_venue_created_idx on public.reviews (venue_id, created_at desc);

-- Conversations: newest-first per guest / venue.
create index if not exists conversations_guest_created_idx  on public.conversations (guest_id, created_at desc);
create index if not exists conversations_venue_created_idx  on public.conversations (venue_id, created_at desc);

-- Venues: location filters + newest live venues.
create index if not exists venues_city_idx        on public.venues (city);
create index if not exists venues_city_live_idx   on public.venues (city) where status = 'live';
create index if not exists venues_area_idx        on public.venues (area) where area is not null;
create index if not exists venues_created_live_idx on public.venues (created_at desc) where status = 'live';

-- GIN indexes for array filters (types / amenities) — powers the Search page filters.
create index if not exists venues_types_gin_idx     on public.venues using gin (types);
create index if not exists venues_amenities_gin_idx on public.venues using gin (amenities);

-- Replace the low-value single-column indexes with composite ones.
drop index if exists public.bookings_user_idx;
drop index if exists public.bookings_venue_idx;
drop index if exists public.conversations_guest_idx;
drop index if exists public.reviews_user_idx;

-- A small partial index for host dashboards: only non-live listings need fast lookup.
create index if not exists venues_not_live_owner_idx on public.venues (owner_id) where status <> 'live';

-- ============================================================
-- 4. profiles table + auto-provisioning trigger (L16)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'gatherer' check (role in ('gatherer', 'host')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read/update their own profile. Hosts can be elevated via the API
-- admin path or by direct DB update for now (see docs/host-features.md).
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Trigger copies the name from raw_user_meta_data and provisions a row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'full_name'),
    coalesce(new.raw_user_meta_data ->> 'role', 'gatherer')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    updated_at = now();
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 5. Message retention / erasure helper (L29)
-- ============================================================
-- Messages are immutable under RLS (no UPDATE/DELETE policy) for audit/integrity.
-- For GDPR / user-deletion requests, a service-role-only function erases the
-- body while keeping the row. Run this from a secure admin job / Supabase function.
create or replace function public.erase_message_bodies(
  p_user_id uuid,
  p_hard_delete boolean default false
)
returns int language plpgsql security definer as $$
declare
  n int;
begin
  if p_hard_delete then
    delete from public.messages where sender_id = p_user_id;
    get diagnostics n = row_count;
  else
    update public.messages
    set body = '[deleted]',
        updated_at = now()
    where sender_id = p_user_id;
    get diagnostics n = row_count;
  end if;
  return n;
end$$;

comment on table public.messages is
  'Immutable chat rows under RLS. For erasure, use service-role erase_message_bodies(user_id, hard_delete).';
