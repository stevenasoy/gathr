-- Gathr v7: RLS + trigger hardening — LAUNCH BLOCKERS (H2 + M23 + L17).
-- Run in Supabase SQL Editor AFTER schema.sql -> host-schema.sql -> v2 -> v3 -> v4 -> v5 -> v6.
-- Safe to re-run (drops + recreates triggers/policies).
--
-- What this addresses (Phase 1 launch blockers only):
--   H2  - bookings host UPDATE policy only checked venue ownership; the v5
--         guard_bookings_immutable trigger only protected user_id/venue_id/total_php,
--         so a host could mutate event_date/hours/guests/event_type/venue_name/note
--         via a direct browser update. Add guard_bookings_host_mutable to freeze those
--         too (status changes stay allowed). guard_bookings_immutable is kept.
--   M23 - conversations had no immutability trigger, so a guest could change
--         venue_id/venue_name on their own row via the "conv: update guest" policy.
--         Add guard_conversations_immutable.
--   L17 - bookings had no guest UPDATE policy, so the API's guest cancel-via-PATCH
--         hit an RLS deny (500). Add "bookings: guest update own".
--
-- NOTE: M21 + M22 (public column-exposure leaks on reviews.user_id / venues.owner_id)
--       are deferred to supabase/v8-public-column-views.sql. They revoke SELECT on the
--       base tables, which breaks apps/api routes that read public.venues /
--       public.reviews directly; those routes must migrate to the v8 views in the same
--       release. Do NOT run v8 until the API route view-migration lands.

-- ============================================================
-- 1. H2: bookings BEFORE UPDATE trigger guard_bookings_host_mutable
--    Raise if any of (user_id, venue_id, total_php, event_date, hours, guests,
--    event_type, venue_name, note) changed. status change is allowed.
--    The existing guard_bookings_immutable trigger is left in place.
-- ============================================================
create or replace function public.guard_bookings_host_mutable()
returns trigger language plpgsql as $$
begin
  if NEW.user_id    is distinct from OLD.user_id
     or NEW.venue_id   is distinct from OLD.venue_id
     or NEW.total_php  is distinct from OLD.total_php
     or NEW.event_date is distinct from OLD.event_date
     or NEW.hours      is distinct from OLD.hours
     or NEW.guests     is distinct from OLD.guests
     or NEW.event_type is distinct from OLD.event_type
     or NEW.venue_name is distinct from OLD.venue_name
     or NEW.note       is distinct from OLD.note then
    raise exception 'bookings user_id/venue_id/total_php/event_date/hours/guests/event_type/venue_name/note are immutable; only status may change';
  end if;
  return NEW;
end$$;

drop trigger if exists bookings_host_mutable on public.bookings;
create trigger bookings_host_mutable before update on public.bookings
  for each row execute function public.guard_bookings_host_mutable();

-- ============================================================
-- 2. M23: conversations guard_conversations_immutable() BEFORE UPDATE trigger
--    Raise if venue_id/venue_name/guest_id changed.
--    (conversations has no host_id column; only the real columns are guarded.)
-- ============================================================
create or replace function public.guard_conversations_immutable()
returns trigger language plpgsql as $$
begin
  if NEW.venue_id   is distinct from OLD.venue_id
     or NEW.venue_name is distinct from OLD.venue_name
     or NEW.guest_id   is distinct from OLD.guest_id then
    raise exception 'conversations venue_id/venue_name/guest_id are immutable';
  end if;
  return NEW;
end$$;

drop trigger if exists conversations_immutable on public.conversations;
create trigger conversations_immutable before update on public.conversations
  for each row execute function public.guard_conversations_immutable();

-- ============================================================
-- 3. L17: bookings guest UPDATE policy
--    Lets a guest update their own booking row (the API only lets them cancel,
--    i.e. set status='cancelled'; the status-transition trigger still enforces
--    the allowed graph, and guard_bookings_host_mutable freezes every other
--    column). Matches existing policy naming style.
-- ============================================================
drop policy if exists "bookings: guest update own" on public.bookings;
create policy "bookings: guest update own" on public.bookings
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);