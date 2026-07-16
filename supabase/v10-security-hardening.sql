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

create or replace view public.venues_live as
select id, name, city, area, types, capacity, price_per_hour, blurb,
       amenities, image_urls, host_name, host_type, price_unit,
       included_hours, status, created_at, updated_at
  from public.venues
 where status = 'live' and deleted_at is null;

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


-- Replace either relation kind without issuing the wrong DROP command.
do $$
declare relation_kind "char";
begin
  select c.relkind into relation_kind
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'venue_review_stats';
  if relation_kind = 'm' then
    execute 'drop materialized view public.venue_review_stats';
  elsif relation_kind = 'v' then
    execute 'drop view public.venue_review_stats';
  elsif relation_kind is not null then
    raise exception 'public.venue_review_stats has unsupported relkind %', relation_kind;
  end if;
end $$;

drop view if exists public.venues_live;
drop view if exists public.reviews_public;
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

drop policy if exists "venues: public read" on public.venues;
drop policy if exists "venues: owner read" on public.venues;
drop policy if exists "venues: owner select" on public.venues;
create policy "venues: owner select" on public.venues
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "reviews: public read" on public.reviews;
drop policy if exists "reviews: reviewer read" on public.reviews;
create policy "reviews: reviewer read" on public.reviews
  for select to authenticated using (user_id = auth.uid());
revoke select on public.venues, public.reviews from anon;
grant select on public.venues, public.reviews to authenticated;
revoke all on public.venues_live, public.reviews_public, public.venue_review_stats from public;
grant select on public.venues_live, public.reviews_public, public.venue_review_stats to anon, authenticated;

create or replace function public.prepare_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.bookings%rowtype;
  profile_name text;
begin
  select * into booking from public.bookings b where b.id = new.booking_id;
  if not found or booking.user_id is distinct from auth.uid()
     or booking.status <> 'confirmed'
     or booking.event_date is null or booking.event_date > pg_catalog.current_date then
    raise exception 'review requires a confirmed completed booking' using errcode = '42501';
  end if;
  select p.full_name into profile_name from public.profiles p where p.id = booking.user_id;
  new.user_id := booking.user_id;
  new.venue_id := booking.venue_id;
  new.author_name := coalesce(nullif(profile_name, ''), 'Gathr member');
  return new;
end $$;
drop trigger if exists reviews_prepare on public.reviews;
create trigger reviews_prepare before insert on public.reviews
for each row execute function public.prepare_review();
revoke all on function public.prepare_review() from public, anon, authenticated;

create or replace function public.guard_reviews_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.booking_id is distinct from old.booking_id
     or new.venue_id is distinct from old.venue_id
     or new.user_id is distinct from old.user_id
     or new.author_name is distinct from old.author_name then
    raise exception 'review identity columns are immutable' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists reviews_immutable on public.reviews;
create trigger reviews_immutable before update on public.reviews
for each row execute function public.guard_reviews_immutable();
revoke all on function public.guard_reviews_immutable() from public, anon, authenticated;

create or replace function private.text_array_within(p_values text[], p_max_items int, p_max_len int)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(cardinality(p_values) <= p_max_items, true)
     and not exists (select 1 from pg_catalog.unnest(coalesce(p_values, '{}'::text[])) as u(value)
                      where value is null or pg_catalog.char_length(value) > p_max_len)
$$;
create or replace function private.url_array_within(p_values text[], p_max_len int)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(cardinality(p_values) <= 20, true)
     and not exists (select 1 from pg_catalog.unnest(coalesce(p_values, '{}'::text[])) as u(value)
                      where value is null or pg_catalog.char_length(value) > p_max_len
                         or value !~ '^https?://')
$$;
grant usage on schema private to authenticated, service_role;
grant execute on function private.text_array_within(text[], int, int), private.url_array_within(text[], int)
  to authenticated, service_role;

alter table public.profiles drop constraint if exists profiles_full_name_len_chk;
alter table public.profiles add constraint profiles_full_name_len_chk
  check (full_name is null or char_length(full_name) <= 120) not valid;
alter table public.venues drop constraint if exists venues_name_len_chk;
alter table public.venues add constraint venues_name_len_chk
  check (char_length(name) <= 160 and (area is null or char_length(area) <= 160)
     and char_length(city) <= 120 and (host_name is null or char_length(host_name) <= 120)
     and private.text_array_within(types, 12, 60)
     and private.text_array_within(amenities, 50, 100)
     and private.url_array_within(image_urls, 2048)) not valid;
alter table public.venues drop constraint if exists venues_included_hours_chk;
alter table public.venues add constraint venues_included_hours_chk
  check (included_hours is null or included_hours between 1 and 168) not valid;
alter table public.bookings drop constraint if exists bookings_text_len_chk;
alter table public.bookings add constraint bookings_text_len_chk
  check (char_length(venue_name) <= 160 and (event_type is null or char_length(event_type) <= 120)
     and (note is null or char_length(note) <= 2000)) not valid;
alter table public.bookings drop constraint if exists bookings_hours_bound_chk;
alter table public.bookings add constraint bookings_hours_bound_chk
  check (hours between 1 and 168) not valid;
alter table public.conversations drop constraint if exists conversations_text_len_chk;
alter table public.conversations add constraint conversations_text_len_chk
  check (char_length(venue_name) <= 160) not valid;
alter table public.messages drop constraint if exists messages_body_len_chk;
alter table public.messages add constraint messages_body_len_chk
  check (char_length(body) <= 5000) not valid;
alter table public.reviews drop constraint if exists reviews_text_len_chk;
alter table public.reviews add constraint reviews_text_len_chk
  check (char_length(author_name) <= 120 and (body is null or char_length(body) <= 4000)) not valid;

create or replace function private.can_upload_venue_photo()
returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
declare actor uuid := auth.uid(); object_count integer;
begin
  if actor is null then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 0));
  select count(*) into object_count from storage.objects o
   where o.bucket_id = 'venue-photos'
     and (storage.foldername(o.name))[1] = actor::text;
  return object_count < 100;
end $$;
grant execute on function private.can_upload_venue_photo() to authenticated, service_role;
drop policy if exists "venue photos: owner upload" on storage.objects;
create policy "venue photos: owner upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'venue-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.can_upload_venue_photo()
  );

drop function if exists public.latest_messages(text, uuid[]);
create function public.latest_messages(p_thread_kind text, p_thread_ids uuid[])
returns table (id uuid, body text, created_at timestamptz, sender_id uuid,
               booking_id uuid, conversation_id uuid)
language sql stable security invoker set search_path = '' as $$
  select id, body, created_at, sender_id, booking_id, conversation_id
    from (
      select distinct on (thread_id) m.id, m.body, m.created_at, m.sender_id,
             m.booking_id, m.conversation_id, m.thread_id
        from (
          select m.*, case when p_thread_kind = 'booking_id' then m.booking_id
                           else m.conversation_id end as thread_id
            from public.messages m
        ) m
       where p_thread_kind in ('booking_id', 'conversation_id')
         and cardinality(coalesce(p_thread_ids, '{}'::uuid[])) <= 200
         and m.thread_id = any(coalesce(p_thread_ids, '{}'::uuid[]))
       order by thread_id, created_at desc, id desc
    ) latest
$$;
revoke all on function public.latest_messages(text, uuid[]) from public, anon;
grant execute on function public.latest_messages(text, uuid[]) to authenticated;

commit;