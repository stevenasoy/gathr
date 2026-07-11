-- Gathr v8: public column-exposure hardening (M21 + M22) — DEFERRED.
-- Run in Supabase SQL Editor AFTER v7, AND only after the API route view-migration
-- (see PREREQ below) has landed, or these revokes will break public read endpoints.
--
-- PREREQ (must ship in the same release as this migration):
--   * apps/api/src/routes/venues.ts  — GET / and GET /:id public reads must query
--     public.venues_live (for anon) instead of public.venues when the caller is
--     unauthenticated. Host-scoped reads (GET /my, owner detail) keep using the
--     base table via the authenticated client.
--   * apps/api/src/routes/reviews.ts — GET /venue/:id, GET /booking/:id must query
--     public.reviews_public instead of public.reviews.
--   * apps/web — audit for any direct supabase.from('venues') / from('reviews')
--     public reads and route them through the views.
-- Without these, revoking base-table SELECT returns errors/empty to clients.
--
-- What this addresses:
--   M21 - reviews public SELECT (using (true)) exposed reviews.user_id (and
--         booking_id) to anon. Replace with a reviews_public view that omits them.
--   M22 - venues public SELECT (using (status = 'live')) exposed venues.owner_id
--         to anon. Replace with a venues_live view that omits owner_id.

-- ============================================================
-- 4. M21: reviews_public view — public reviews without user_id/booking_id
--    Columns taken from v4 (reviews) + v5 (updated_at): the public shape is
--    id, venue_id, author_name, rating, body, created_at.
-- ============================================================
create or replace view public.reviews_public as
select id, venue_id, author_name, rating, body, created_at
from public.reviews;

grant select on public.reviews_public to anon, authenticated;

-- Revoke direct table SELECT so anon/authenticated can only read via the view.
-- Owners keep policy-based table access (reviews: update own / delete own imply
-- the owner can still select their own rows; insert is gated by the reviewer
-- policy). Authenticated authors can still read their own reviews through RLS.
revoke select on public.reviews from anon;
revoke select on public.reviews from authenticated;

-- ============================================================
-- 5. M22: venues_live view — live listings without owner_id
--    All venue listing columns except owner_id. Columns taken from
--    host-schema.sql + v2 (status, host_type, price_unit) + v3 (included_hours)
--    + v5 (updated_at).
-- ============================================================
create or replace view public.venues_live as
select id, name, city, area, types, capacity, price_per_hour, blurb,
       amenities, image_urls, host_name, created_at, status, host_type,
       price_unit, included_hours, updated_at
from public.venues
where status = 'live';

grant select on public.venues_live to anon, authenticated;

-- Revoke direct table SELECT from anon only. Authenticated table select is
-- kept so hosts can read their own rows at any status via the "venues: owner
-- read" policy (used by GET /api/venues/my and the owner-detail lookup).
revoke select on public.venues from anon;