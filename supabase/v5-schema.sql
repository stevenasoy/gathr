-- Gathr v5: production hardening (referential integrity, RLS WITH CHECK,
-- status transitions, immutability, updated_at, indexes).
-- Run in Supabase SQL Editor AFTER schema.sql → host-schema.sql → v2 → v3 → v4.
-- Safe to re-run (drops + recreates; uses NOT VALID for CHECKs to avoid failing
-- on historical dirty rows — run `validate constraint` separately once clean).
--
-- Pre-flight: abort the migration if any referenced venue_id is not a valid
-- uuid, since A1 casts venue_id text → uuid and would fail mid-script (leaving
-- partial state). Casts to ::text so the guard works whether the column is
-- still text or already uuid. Safe to re-run.
do $$
declare
  bad_bookings      int;
  bad_conversations int;
  bad_reviews       int;
  bad_saved         int;
begin
  select count(*) into bad_bookings
    from public.bookings
    where venue_id is not null and venue_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  select count(*) into bad_conversations
    from public.conversations
    where venue_id is not null and venue_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  select count(*) into bad_reviews
    from public.reviews
    where venue_id is not null and venue_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  select count(*) into bad_saved
    from public.saved_venues
    where venue_id is not null and venue_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  if bad_bookings + bad_conversations + bad_reviews + bad_saved > 0 then
    raise exception 'Pre-flight failed: non-uuid venue_id rows found (bookings=%, conversations=%, reviews=%, saved_venues=%). Clean these up before re-running.',
      bad_bookings, bad_conversations, bad_reviews, bad_saved
      using errcode = 'check_violation';
  end if;
end$$;

-- ============================================================
-- A1. venue_id text → uuid + real FK ON DELETE CASCADE (blocker 3)
--     Eliminates orphans on venue delete; enforces existence on insert.
-- ============================================================
alter table public.bookings      alter column venue_id type uuid using venue_id::uuid;
alter table public.conversations alter column venue_id type uuid using venue_id::uuid;
alter table public.reviews       alter column venue_id type uuid using venue_id::uuid;
alter table public.saved_venues  alter column venue_id type uuid using venue_id::uuid;

alter table public.bookings      drop constraint if exists bookings_venue_fk;
alter table public.bookings      add constraint bookings_venue_fk foreign key (venue_id)
  references public.venues(id) on delete cascade;

alter table public.conversations drop constraint if exists conversations_venue_fk;
alter table public.conversations add constraint conversations_venue_fk foreign key (venue_id)
  references public.venues(id) on delete cascade;

alter table public.reviews       drop constraint if exists reviews_venue_fk;
alter table public.reviews       add constraint reviews_venue_fk foreign key (venue_id)
  references public.venues(id) on delete cascade;

alter table public.saved_venues  drop constraint if exists saved_venues_venue_fk;
alter table public.saved_venues  add constraint saved_venues_venue_fk foreign key (venue_id)
  references public.venues(id) on delete cascade;

-- ============================================================
-- A2. Recreate policies that joined v.id::text = X.venue_id (now uuid join)
-- ============================================================
drop policy if exists "bookings: host select" on public.bookings;
create policy "bookings: host select" on public.bookings
  for select using (
    exists (select 1 from public.venues v
            where v.id = bookings.venue_id and v.owner_id = auth.uid())
  );

-- A3 + A4. Bookings insert (blocker 1) + host update WITH CHECK (blocker 2)
drop policy if exists "bookings: insert own" on public.bookings;
create policy "bookings: insert own" on public.bookings
  for insert with check (
    auth.uid() = user_id
    and status = 'requested'
    and total_php > 0
    and exists (select 1 from public.venues v
                where v.id = bookings.venue_id and v.status = 'live')
  );

drop policy if exists "bookings: host update" on public.bookings;
create policy "bookings: host update" on public.bookings
  for update
  using (
    exists (select 1 from public.venues v
            where v.id = bookings.venue_id and v.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.venues v
            where v.id = bookings.venue_id and v.owner_id = auth.uid())
  );

drop policy if exists "conv: read party" on public.conversations;
create policy "conv: read party" on public.conversations
  for select using (
    guest_id = auth.uid()
    or exists (select 1 from public.venues v
               where v.id = conversations.venue_id and v.owner_id = auth.uid())
  );

drop policy if exists "messages: read party" on public.messages;
create policy "messages: read party" on public.messages for select using (
  (booking_id is not null and exists (
    select 1 from public.bookings b where b.id = messages.booking_id and (
      b.user_id = auth.uid()
      or exists (select 1 from public.venues v where v.id = b.venue_id and v.owner_id = auth.uid()))))
  or
  (conversation_id is not null and exists (
    select 1 from public.conversations c where c.id = messages.conversation_id and (
      c.guest_id = auth.uid()
      or exists (select 1 from public.venues v where v.id = c.venue_id and v.owner_id = auth.uid()))))
);

drop policy if exists "messages: insert party" on public.messages;
create policy "messages: insert party" on public.messages for insert with check (
  sender_id = auth.uid() and (
    (booking_id is not null and exists (
      select 1 from public.bookings b where b.id = messages.booking_id and (
        b.user_id = auth.uid()
        or exists (select 1 from public.venues v where v.id = b.venue_id and v.owner_id = auth.uid()))))
    or
    (conversation_id is not null and exists (
      select 1 from public.conversations c where c.id = messages.conversation_id and (
        c.guest_id = auth.uid()
        or exists (select 1 from public.venues v where v.id = c.venue_id and v.owner_id = auth.uid()))))
  )
);

-- ============================================================
-- A4b. Bookings immutability trigger — forbid user_id/venue_id/total_php mutation
--      (WITH CHECK can't compare old vs new; trigger can)
-- ============================================================
create or replace function public.guard_bookings_immutable()
returns trigger language plpgsql as $$
begin
  if NEW.user_id is distinct from OLD.user_id
     or NEW.venue_id is distinct from OLD.venue_id
     or NEW.total_php is distinct from OLD.total_php then
    raise exception 'bookings user_id/venue_id/total_php are immutable';
  end if;
  return NEW;
end$$;

drop trigger if exists bookings_immutable on public.bookings;
create trigger bookings_immutable before update on public.bookings
  for each row execute function public.guard_bookings_immutable();

-- ============================================================
-- A5. Booking status transition trigger + CHECK enums (high)
--      requested → confirmed|declined|cancelled
--      confirmed → completed|cancelled
--      declined → cancelled
-- ============================================================
create or replace function public.guard_booking_status()
returns trigger language plpgsql as $$
begin
  if NEW.status is distinct from OLD.status and not (
      (OLD.status = 'requested' and NEW.status in ('confirmed','declined','cancelled'))
   or (OLD.status = 'confirmed' and NEW.status in ('completed','cancelled'))
   or (OLD.status = 'declined'  and NEW.status = 'cancelled')
  ) then
    raise exception 'invalid booking status transition % → %', OLD.status, NEW.status;
  end if;
  return NEW;
end$$;

drop trigger if exists bookings_status_guard on public.bookings;
create trigger bookings_status_guard before update on public.bookings
  for each row execute function public.guard_booking_status();

alter table public.bookings drop constraint if exists bookings_status_chk;
alter table public.bookings add constraint bookings_status_chk
  check (status in ('requested','confirmed','declined','cancelled','completed')) not valid;
alter table public.bookings drop constraint if exists bookings_total_chk;
alter table public.bookings add constraint bookings_total_chk check (total_php >= 0) not valid;
alter table public.bookings drop constraint if exists bookings_hours_chk;
alter table public.bookings add constraint bookings_hours_chk check (hours > 0) not valid;

-- ============================================================
-- A6. WITH CHECK on venues + reviews update (high) + reviews immutability
-- ============================================================
drop policy if exists "venues: update own" on public.venues;
create policy "venues: update own" on public.venues
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "reviews: update own" on public.reviews;
create policy "reviews: update own" on public.reviews
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.guard_reviews_immutable()
returns trigger language plpgsql as $$
begin
  if NEW.booking_id is distinct from OLD.booking_id
     or NEW.venue_id is distinct from OLD.venue_id
     or NEW.user_id is distinct from OLD.user_id
     or NEW.author_name is distinct from OLD.author_name then
    raise exception 'review identity columns are immutable';
  end if;
  return NEW;
end$$;

drop trigger if exists reviews_immutable on public.reviews;
create trigger reviews_immutable before update on public.reviews
  for each row execute function public.guard_reviews_immutable();

-- ============================================================
-- A7. Enum CHECKs on venues (medium) — NOT VALID avoids failing on dirty rows
-- ============================================================
alter table public.venues drop constraint if exists venues_status_chk;
alter table public.venues add constraint venues_status_chk
  check (status in ('live','unlisted','draft')) not valid;
alter table public.venues drop constraint if exists venues_host_type_chk;
alter table public.venues add constraint venues_host_type_chk
  check (host_type in ('individual','business')) not valid;
alter table public.venues drop constraint if exists venues_price_unit_chk;
alter table public.venues add constraint venues_price_unit_chk
  check (price_unit in ('hour','head','event')) not valid;
alter table public.venues drop constraint if exists venues_price_chk;
alter table public.venues add constraint venues_price_chk check (price_per_hour >= 0) not valid;
alter table public.venues drop constraint if exists venues_capacity_chk;
alter table public.venues add constraint venues_capacity_chk check (capacity > 0) not valid;

-- ============================================================
-- A8. conversations update policy (medium)
--     Fixes getOrCreateConversation upsert's UPDATE arm (no update policy existed)
-- ============================================================
drop policy if exists "conv: update guest" on public.conversations;
create policy "conv: update guest" on public.conversations
  for update using (guest_id = auth.uid())
  with check (guest_id = auth.uid());

-- ============================================================
-- A9. updated_at columns + shared touch trigger (medium)
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end$$;

alter table public.venues        add column if not exists updated_at timestamptz not null default now();
alter table public.bookings      add column if not exists updated_at timestamptz not null default now();
alter table public.conversations add column if not exists updated_at timestamptz not null default now();
alter table public.messages      add column if not exists updated_at timestamptz not null default now();
alter table public.reviews       add column if not exists updated_at timestamptz not null default now();
alter table public.saved_venues  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists venues_touch        on public.venues;
drop trigger if exists bookings_touch      on public.bookings;
drop trigger if exists conversations_touch  on public.conversations;
drop trigger if exists messages_touch      on public.messages;
drop trigger if exists reviews_touch       on public.reviews;
drop trigger if exists saved_venues_touch  on public.saved_venues;

create trigger venues_touch        before update on public.venues        for each row execute function public.touch_updated_at();
create trigger bookings_touch      before update on public.bookings      for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations for each row execute function public.touch_updated_at();
create trigger messages_touch      before update on public.messages      for each row execute function public.touch_updated_at();
create trigger reviews_touch       before update on public.reviews       for each row execute function public.touch_updated_at();
create trigger saved_venues_touch  before update on public.saved_venues  for each row execute function public.touch_updated_at();

-- ============================================================
-- A10. Indexes on hot lookup columns (medium)
-- ============================================================
create index if not exists bookings_user_idx   on public.bookings (user_id);
create index if not exists bookings_venue_idx   on public.bookings (venue_id);
create index if not exists bookings_status_idx  on public.bookings (status);
create index if not exists venues_owner_idx     on public.venues (owner_id);
create index if not exists venues_status_idx     on public.venues (status);
create index if not exists conversations_guest_idx on public.conversations (guest_id);
create index if not exists reviews_user_idx      on public.reviews (user_id);
create index if not exists saved_venues_venue_idx on public.saved_venues (venue_id);

-- ============================================================
-- A11. messages exactly-one-non-null CHECK (low, conditional)
--      Pre-flight: select count(*) from public.messages where booking_id is null and conversation_id is null;
--      If > 0, those legacy rows stay (NOT VALID skips them) but cannot be updated until fixed.
-- ============================================================
alter table public.messages drop constraint if exists messages_thread_chk;
alter table public.messages add constraint messages_thread_chk
  check ((booking_id is not null)::int + (conversation_id is not null)::int = 1) not valid;