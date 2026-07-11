-- Gathr schema. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

-- ============ Saved venues ============
create table if not exists public.saved_venues (
  user_id    uuid not null references auth.users(id) on delete cascade,
  venue_id   text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

alter table public.saved_venues enable row level security;

drop policy if exists "saved: select own" on public.saved_venues;
drop policy if exists "saved: insert own" on public.saved_venues;
drop policy if exists "saved: delete own" on public.saved_venues;

create policy "saved: select own" on public.saved_venues
  for select using (auth.uid() = user_id);
create policy "saved: insert own" on public.saved_venues
  for insert with check (auth.uid() = user_id);
create policy "saved: delete own" on public.saved_venues
  for delete using (auth.uid() = user_id);

-- ============ Bookings ============
create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  venue_id    text not null,
  venue_name  text not null,
  event_type  text,
  event_date  date,
  hours       int not null default 4,
  guests      int,
  total_php   int not null,
  status      text not null default 'requested',
  created_at  timestamptz not null default now()
);

alter table public.bookings enable row level security;

drop policy if exists "bookings: select own" on public.bookings;
drop policy if exists "bookings: insert own" on public.bookings;
drop policy if exists "bookings: delete own" on public.bookings;

create policy "bookings: select own" on public.bookings
  for select using (auth.uid() = user_id);
create policy "bookings: insert own" on public.bookings
  for insert with check (auth.uid() = user_id);
create policy "bookings: delete own" on public.bookings
  for delete using (auth.uid() = user_id);
