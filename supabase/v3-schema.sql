-- Gathr v3: pre-booking inquiries (guest <-> venue owner messaging without a booking).
-- Run in Supabase SQL Editor. Safe to re-run.

-- ============ Per-head / per-event included duration (optional) ============
alter table public.venues add column if not exists included_hours int;

-- ============ Conversations (one per guest + venue) ============
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  venue_id   text not null,
  venue_name text not null,
  guest_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (venue_id, guest_id)
);

alter table public.conversations enable row level security;

drop policy if exists "conv: read party" on public.conversations;
create policy "conv: read party" on public.conversations
  for select using (
    guest_id = auth.uid()
    or exists (select 1 from public.venues v where v.id::text = conversations.venue_id and v.owner_id = auth.uid())
  );

drop policy if exists "conv: insert guest" on public.conversations;
create policy "conv: insert guest" on public.conversations
  for insert with check (guest_id = auth.uid());

-- ============ Messages may belong to a booking OR a conversation ============
alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages alter column booking_id drop not null;

drop policy if exists "messages: read party" on public.messages;
create policy "messages: read party" on public.messages for select using (
  (booking_id is not null and exists (
    select 1 from public.bookings b where b.id = messages.booking_id and (
      b.user_id = auth.uid()
      or exists (select 1 from public.venues v where v.id::text = b.venue_id and v.owner_id = auth.uid()))))
  or
  (conversation_id is not null and exists (
    select 1 from public.conversations c where c.id = messages.conversation_id and (
      c.guest_id = auth.uid()
      or exists (select 1 from public.venues v where v.id::text = c.venue_id and v.owner_id = auth.uid()))))
);

drop policy if exists "messages: insert party" on public.messages;
create policy "messages: insert party" on public.messages for insert with check (
  sender_id = auth.uid() and (
    (booking_id is not null and exists (
      select 1 from public.bookings b where b.id = messages.booking_id and (
        b.user_id = auth.uid()
        or exists (select 1 from public.venues v where v.id::text = b.venue_id and v.owner_id = auth.uid()))))
    or
    (conversation_id is not null and exists (
      select 1 from public.conversations c where c.id = messages.conversation_id and (
        c.guest_id = auth.uid()
        or exists (select 1 from public.venues v where v.id::text = c.venue_id and v.owner_id = auth.uid()))))
  )
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ============ Realtime ============
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.conversations'; exception when others then null; end;
end $$;
