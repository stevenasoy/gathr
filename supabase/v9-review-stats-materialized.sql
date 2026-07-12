-- Gathr v9: Materialize the venue_review_stats view
-- Run in Supabase SQL Editor AFTER schema.sql → host-schema.sql → v2 → v3 → v4 → v5 → v6.
-- v9 runs after v6 and replaces the v6 plain view with a MATERIALIZED VIEW that is
-- kept fresh by triggers on public.reviews. Safe to re-run.
--
-- Why: a plain view re-runs the full reviews aggregation on every SELECT. A
-- materialized view snapshots the aggregation so the API's
-- `.from('venue_review_stats')` query is a cheap read off the materialized rows.
-- The AFTER INSERT/UPDATE/DELETE triggers below REFRESH CONCURRENTLY on every
-- review write, so staleness is bounded to <= one write. The API works unchanged
-- against the materialized view (same name, same columns).

-- ============================================================
-- 1. Drop the v6 plain view and create a MATERIALIZED VIEW
-- ============================================================
drop view if exists public.venue_review_stats;

create materialized view if not exists public.venue_review_stats as
select
  venue_id,
  count(*)::int as count,
  avg(rating)::numeric(3,2) as avg
from public.reviews
group by venue_id;

-- A UNIQUE index on venue_id is required so we can REFRESH CONCURRENTLY
-- (concurrent refresh needs a unique index that covers all rows).
create unique index if not exists venue_review_stats_venue_id_uidx
  on public.venue_review_stats (venue_id);

-- Keep the view accessible to anonymous and authenticated users.
-- Materialized views need explicit grants (they are not covered by table RLS).
grant select on public.venue_review_stats to anon, authenticated;

-- ============================================================
-- 2. Trigger function: refresh the materialized view concurrently
-- ============================================================
-- CONCURRENTLY avoids locking the view out for reads during refresh; it is
-- safe here because the unique index above satisfies the precondition.
create or replace function public.refresh_review_stats()
returns trigger
language plpgsql
as $$
begin
  refresh materialized view concurrently public.venue_review_stats;
  return null;
end;
$$;

-- ============================================================
-- 3. AFTER INSERT/UPDATE/DELETE triggers on public.reviews
--    Each review write refreshes the materialized view, so the view is never
--    more than one write stale.
-- ============================================================
drop trigger if exists reviews_refresh_review_stats_insert on public.reviews;
drop trigger if exists reviews_refresh_review_stats_update on public.reviews;
drop trigger if exists reviews_refresh_review_stats_delete on public.reviews;

create trigger reviews_refresh_review_stats_insert
  after insert on public.reviews
  for each statement execute function public.refresh_review_stats();

create trigger reviews_refresh_review_stats_update
  after update on public.reviews
  for each statement execute function public.refresh_review_stats();

create trigger reviews_refresh_review_stats_delete
  after delete on public.reviews
  for each statement execute function public.refresh_review_stats();