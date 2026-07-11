-- Gathr host schema. Run AFTER schema.sql, in Supabase → SQL Editor. Safe to re-run.

-- ============ Venues (host-owned, publicly readable) ============
create table if not exists public.venues (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  city           text not null,
  area           text,
  types          text[] not null default '{}',
  capacity       int  not null default 50,
  price_per_hour int  not null,
  blurb          text,
  amenities      text[] not null default '{}',
  image_urls     text[] not null default '{}',
  host_name      text,
  created_at     timestamptz not null default now()
);

alter table public.venues enable row level security;

drop policy if exists "venues: public read" on public.venues;
drop policy if exists "venues: insert own" on public.venues;
drop policy if exists "venues: update own" on public.venues;
drop policy if exists "venues: delete own" on public.venues;

create policy "venues: public read" on public.venues
  for select using (true);
create policy "venues: insert own" on public.venues
  for insert with check (owner_id = auth.uid());
create policy "venues: update own" on public.venues
  for update using (owner_id = auth.uid());
create policy "venues: delete own" on public.venues
  for delete using (owner_id = auth.uid());

-- ============ Let hosts see + manage requests on their venues ============
drop policy if exists "bookings: host select" on public.bookings;
drop policy if exists "bookings: host update" on public.bookings;

create policy "bookings: host select" on public.bookings
  for select using (
    exists (select 1 from public.venues v
            where v.id::text = bookings.venue_id and v.owner_id = auth.uid())
  );
create policy "bookings: host update" on public.bookings
  for update using (
    exists (select 1 from public.venues v
            where v.id::text = bookings.venue_id and v.owner_id = auth.uid())
  );

-- ============ Prevent double-booking ============
-- At most one CONFIRMED booking per venue per date. Multiple pending
-- requests for the same date are allowed; the host can only confirm one.
create unique index if not exists bookings_one_confirmed_per_date
  on public.bookings (venue_id, event_date)
  where status = 'confirmed';
