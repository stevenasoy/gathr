-- Gathr v12: bookings carry a start time, and confirmed bookings may share a
-- date as long as their time slots do not overlap.
--
-- Before: one confirmed booking per venue per date (unique partial index).
-- After:  start_time (nullable) on bookings. A booking with no start_time
--         blocks the whole day. Confirmed slots on the same venue may not
--         overlap, enforced by an exclusion constraint on the time range.
--
-- Apply after v11-keep-bookings-on-gathr.sql. Idempotent.

begin;

create extension if not exists btree_gist;

alter table public.bookings add column if not exists start_time time;

-- The slot a booking occupies. Whole day when start_time is null, else
-- [start, start + hours). Null when there is no date. Immutable so it can sit
-- in an index expression.
create or replace function public.booking_slot(p_date date, p_start time, p_hours int)
returns tsrange
language sql
immutable
set search_path = ''
as $$
  select case
    when p_date is null then null
    when p_start is null then tsrange(p_date::timestamp, (p_date + 1)::timestamp, '[)')
    else tsrange(p_date + p_start, p_date + p_start + make_interval(hours => coalesce(p_hours, 1)), '[)')
  end
$$;

-- Index expressions are evaluated as the inserting role, so the booking
-- parties need EXECUTE. anon never writes bookings.
revoke execute on function public.booking_slot(date, time, int) from public, anon;
grant execute on function public.booking_slot(date, time, int) to authenticated, service_role;

drop index if exists public.bookings_one_confirmed_per_date;

alter table public.bookings drop constraint if exists bookings_no_overlap_confirmed;
alter table public.bookings add constraint bookings_no_overlap_confirmed
  exclude using gist (
    venue_id with =,
    public.booking_slot(event_date, start_time, hours) with &&
  ) where (status = 'confirmed');

-- start_time joins the immutable set from v7: only status may change after
-- the request is made.
create or replace function public.guard_bookings_host_mutable()
returns trigger language plpgsql as $$
begin
  if NEW.user_id    is distinct from OLD.user_id
     or NEW.venue_id   is distinct from OLD.venue_id
     or NEW.total_php  is distinct from OLD.total_php
     or NEW.event_date is distinct from OLD.event_date
     or NEW.start_time is distinct from OLD.start_time
     or NEW.hours      is distinct from OLD.hours
     or NEW.guests     is distinct from OLD.guests
     or NEW.event_type is distinct from OLD.event_type
     or NEW.venue_name is distinct from OLD.venue_name
     or NEW.note       is distinct from OLD.note then
    raise exception 'bookings user_id/venue_id/total_php/event_date/start_time/hours/guests/event_type/venue_name/note are immutable; only status may change';
  end if;
  return NEW;
end$$;

commit;
