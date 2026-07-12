-- Gathr v9: Public column views for venues and reviews (M21 + M22).
-- Run in Supabase SQL Editor AFTER schema.sql → host-schema.sql → v2 → v3 → v4
-- → v5 → v6 → v7 → v8.
-- Safe to re-run (drops + recreates views idempotently).
--
-- Why: the base `venues` and `reviews` tables expose `owner_id` and `user_id`
-- respectively — stable auth.users UUIDs — to anonymous browsers. The web SPA
-- only needs the public listing columns. These views strip the UUID columns and
-- become the only public read surface for anon users.
--
-- NOTE: authenticated users still SELECT from the base tables (RLS enforces
-- row access) so Host dashboards and review authors can see their own UUIDs.

-- ============================================================
-- 1. venues_live — public listing surface
-- ============================================================
drop view if exists public.venues_live;

create view public.venues_live as
select
  id,
  name,
  city,
  area,
  types,
  capacity,
  price_per_hour,
  blurb,
  amenities,
  image_urls,
  host_name,
  host_type,
  price_unit,
  included_hours,
  status,
  created_at,
  updated_at
from public.venues
where status = 'live';

comment on view public.venues_live is 'Public venue listings. Excludes owner_id.';

-- ============================================================
-- 2. reviews_public — public review surface
-- ============================================================
drop view if exists public.reviews_public;

create view public.reviews_public as
select
  id,
  booking_id,
  venue_id,
  author_name,
  rating,
  body,
  created_at,
  updated_at
from public.reviews;

comment on view public.reviews_public is 'Public reviews. Excludes user_id.';

-- ============================================================
-- 3. Permissions
-- ============================================================
-- Public (anon) reads go through the views only.
grant select on public.venues_live to anon, authenticated;
grant select on public.reviews_public to anon, authenticated;

-- Revoke direct base-table SELECT from anon so a leaked anon key cannot scan
-- owner_id / user_id. Authenticated keeps base-table SELECT for host/reviewer
-- workflows.
revoke select on public.venues from anon;
revoke select on public.reviews from anon;

-- Keep the materialized stats view accessible (it already only exposes venue_id).
grant select on public.venue_review_stats to anon, authenticated;
