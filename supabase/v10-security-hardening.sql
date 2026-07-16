-- Gathr v10: lock privileged functions and profile roles.

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
-- Task 4 intentionally replaces the removed review-refresh materialized view
-- path with a safe view.

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

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'profile roles are server-managed' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
before update of role on public.profiles
for each row execute function public.guard_profile_role();

revoke all on function public.guard_profile_role() from public, anon, authenticated;


-- Task 3: database-authoritative booking pricing, state, and soft deletion.
alter table public.bookings add column if not exists deleted_at timestamptz;
alter table public.venues add column if not exists deleted_at timestamptz;
alter table public.bookings alter column total_php type bigint using total_php::bigint;

alter table public.venues drop constraint if exists venues_capacity_chk;
alter table public.venues add constraint venues_capacity_chk
  check (capacity between 1 and 100000) not valid;
alter table public.venues drop constraint if exists venues_price_chk;
alter table public.venues add constraint venues_price_chk
  check (price_per_hour between 0 and 100000000) not valid;

-- Replace the legacy split guards with one actor-aware update guard.
drop trigger if exists bookings_immutable on public.bookings;
drop trigger if exists bookings_host_mutable on public.bookings;
drop trigger if exists bookings_status_guard on public.bookings;
drop trigger if exists bookings_prepare on public.bookings;
drop trigger if exists bookings_write_guard on public.bookings;
drop trigger if exists bookings_guard_write on public.bookings;
drop function if exists public.guard_bookings_immutable();
drop function if exists public.guard_bookings_host_mutable();
drop function if exists public.guard_booking_status();

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
  new.deleted_at := null;
  new.total_php := subtotal + pg_catalog.round(subtotal * 0.10)::bigint;
  return new;
end $$;

create trigger bookings_prepare
before insert on public.bookings
for each row execute function public.prepare_booking();
revoke all on function public.prepare_booking() from public, anon, authenticated;

create or replace function public.guard_booking_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', '');
  actor uuid := auth.uid();
  is_host boolean;
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.venue_id is distinct from old.venue_id
     or new.venue_name is distinct from old.venue_name
     or new.event_type is distinct from old.event_type
     or new.event_date is distinct from old.event_date
     or new.hours is distinct from old.hours
     or new.guests is distinct from old.guests
     or new.total_php is distinct from old.total_php
     or new.created_at is distinct from old.created_at
     or new.note is distinct from old.note then
    raise exception 'booking identity, event, and pricing fields are immutable' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at
     and new.status <> 'cancelled' then
    raise exception 'deleted_at requires cancelled status' using errcode = '42501';
  end if;
  if caller_role = 'service_role' then
    return new;
  end if;
  if caller_role <> 'authenticated' or actor is null then
    raise exception 'booking updates require an authenticated party' using errcode = '42501';
  end if;
  select exists (
    select 1 from public.venues v
     where v.id = old.venue_id and v.owner_id = actor
  ) into is_host;
  if actor = old.user_id then
    if old.status <> 'requested' or new.status <> 'cancelled' then
      raise exception 'guests may only cancel requested bookings' using errcode = '42501';
    end if;
  elsif is_host then
    if not (
      (old.status = 'requested' and new.status in ('confirmed','declined','cancelled'))
      or (old.status = 'confirmed' and new.status in ('completed','cancelled'))
      or (old.status = 'declined' and new.status = 'cancelled')
    ) then
      raise exception 'invalid booking status transition' using errcode = '42501';
    end if;
  else
    raise exception 'booking update is limited to guest or venue owner' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger bookings_guard_write
before update on public.bookings
for each row execute function public.guard_booking_write();
revoke all on function public.guard_booking_write() from public, anon, authenticated;

alter table public.bookings drop constraint if exists bookings_status_chk;
alter table public.bookings add constraint bookings_status_chk
  check (status in ('requested','confirmed','declined','cancelled','completed')) not valid;
alter table public.bookings drop constraint if exists bookings_total_chk;
alter table public.bookings add constraint bookings_total_chk check (total_php >= 0) not valid;
alter table public.bookings drop constraint if exists bookings_hours_chk;
alter table public.bookings add constraint bookings_hours_chk check (hours > 0) not valid;

drop policy if exists "bookings: insert own" on public.bookings;
create policy "bookings: insert own" on public.bookings
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'requested' and deleted_at is null);
drop policy if exists "bookings: delete own" on public.bookings;
drop policy if exists "bookings: guest update own" on public.bookings;
create policy "bookings: guest update own" on public.bookings
  for update to authenticated
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);
drop policy if exists "bookings: host update" on public.bookings;
create policy "bookings: host update" on public.bookings
  for update to authenticated
  using (deleted_at is null and exists (
    select 1 from public.venues v
     where v.id = bookings.venue_id and v.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.venues v
     where v.id = bookings.venue_id and v.owner_id = auth.uid()));

drop policy if exists "venues: delete own" on public.venues;
drop policy if exists "venues: update own" on public.venues;
create policy "venues: update own" on public.venues
  for update to authenticated
  using (owner_id = auth.uid() and deleted_at is null)
  with check (owner_id = auth.uid());

-- Cross-party content is retained when a parent is removed; user-owned
-- profiles/saved_venues keep their original account cleanup cascades.
alter table public.bookings drop constraint if exists bookings_venue_fk;
alter table public.bookings drop constraint if exists bookings_venue_id_fkey;
alter table public.bookings add constraint bookings_venue_fk
  foreign key (venue_id) references public.venues(id) on delete restrict;
alter table public.conversations drop constraint if exists conversations_venue_fk;
alter table public.conversations drop constraint if exists conversations_venue_id_fkey;
alter table public.conversations add constraint conversations_venue_fk
  foreign key (venue_id) references public.venues(id) on delete restrict;
alter table public.messages drop constraint if exists messages_booking_id_fkey;
alter table public.messages drop constraint if exists messages_booking_fk;
alter table public.messages add constraint messages_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete restrict;
alter table public.messages drop constraint if exists messages_conversation_id_fkey;
alter table public.messages add constraint messages_conversation_id_fkey
  foreign key (conversation_id) references public.conversations(id) on delete restrict;
alter table public.reviews drop constraint if exists reviews_booking_id_fkey;
alter table public.reviews drop constraint if exists reviews_booking_fk;
alter table public.reviews add constraint reviews_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete restrict;
alter table public.reviews drop constraint if exists reviews_venue_fk;
alter table public.reviews drop constraint if exists reviews_venue_id_fkey;
alter table public.reviews add constraint reviews_venue_fk
  foreign key (venue_id) references public.venues(id) on delete restrict;

commit;
