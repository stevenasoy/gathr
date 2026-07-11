-- Gathr v2: listing status, messages, realtime. Run in Supabase SQL Editor. Safe to re-run.

-- ============ Listing status (live / unlisted) ============
alter table public.venues add column if not exists status text not null default 'live';

-- ============ Host type (individual / business) ============
alter table public.venues add column if not exists host_type text not null default 'individual';

-- ============ Booking special requests note ============
alter table public.bookings add column if not exists note text;

-- ============ Pricing unit (hour / head / event) ============
alter table public.venues add column if not exists price_unit text not null default 'hour';

-- Public sees only live venues; owners see their own at any status.
drop policy if exists "venues: public read" on public.venues;
create policy "venues: public read" on public.venues
  for select using (status = 'live');

drop policy if exists "venues: owner read" on public.venues;
create policy "venues: owner read" on public.venues
  for select using (owner_id = auth.uid());

-- ============ Messages (per-booking, guest <-> host) ============
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- A user may read/write a thread if they are the booking's guest OR the venue's owner.
drop policy if exists "messages: read party" on public.messages;
create policy "messages: read party" on public.messages
  for select using (
    exists (select 1 from public.bookings b
            where b.id = messages.booking_id and (
              b.user_id = auth.uid()
              or exists (select 1 from public.venues v
                         where v.id::text = b.venue_id and v.owner_id = auth.uid())
            ))
  );

drop policy if exists "messages: insert party" on public.messages;
create policy "messages: insert party" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (select 1 from public.bookings b
                where b.id = messages.booking_id and (
                  b.user_id = auth.uid()
                  or exists (select 1 from public.venues v
                             where v.id::text = b.venue_id and v.owner_id = auth.uid())
                ))
  );

create index if not exists messages_booking_idx on public.messages (booking_id, created_at);

-- ============ A booker can't cancel once confirmed ============
drop policy if exists "bookings: delete own" on public.bookings;
create policy "bookings: delete own" on public.bookings
  for delete using (auth.uid() = user_id and status <> 'confirmed');

-- ============ Realtime (live notifications + chat) ============
-- Adds tables to the realtime publication; ignore "already member" errors.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.bookings'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.messages'; exception when others then null; end;
end $$;
