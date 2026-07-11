-- Gathr v6: Performance Tuning (Database view for review stats, compound indexes for chat)
-- Run in Supabase SQL Editor AFTER schema.sql → host-schema.sql → v2 → v3 → v4 → v5.
-- Safe to re-run.

-- ============================================================
-- 1. Create a database view for review aggregation stats
--    Allows the Express API to fetch aggregate stats in O(N_venues)
--    instead of loading O(N_reviews) rows into Node.js memory.
-- ============================================================
create or replace view public.venue_review_stats as
select
  venue_id,
  count(*)::int as count,
  avg(rating)::numeric(3,2) as avg
from public.reviews
group by venue_id;

-- Make the view accessible to anonymous and authenticated users
grant select on public.venue_review_stats to anon, authenticated;

-- ============================================================
-- 2. Compound indexes for optimized latest-message inbox lookups
--    Speeds up "O(1) per thread" lookups in the chat inbox.
-- ============================================================
create index if not exists messages_booking_created_idx on public.messages (booking_id, created_at desc);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
