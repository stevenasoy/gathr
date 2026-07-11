-- Gathr v4: host photo uploads (Storage) + real guest reviews.
-- Run in Supabase SQL Editor. Safe to re-run.

-- ============ Storage: venue-photos bucket ============
-- Public-read bucket. Uploads are limited to signed-in users writing into
-- their own folder (<user_id>/<file>), which is what lib/storage.js does.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('venue-photos', 'venue-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif'];

drop policy if exists "venue photos: public read" on storage.objects;
create policy "venue photos: public read" on storage.objects
  for select using (bucket_id = 'venue-photos');

drop policy if exists "venue photos: owner upload" on storage.objects;
create policy "venue photos: owner upload" on storage.objects
  for insert with check (
    bucket_id = 'venue-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "venue photos: owner delete" on storage.objects;
create policy "venue photos: owner delete" on storage.objects
  for delete using (
    bucket_id = 'venue-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============ Reviews ============
-- One review per booking (unique booking_id). Only the Gatherer of a
-- confirmed, past booking can write one — same rule the host dashboard uses
-- to call a booking "Completed".
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings(id) on delete cascade,
  venue_id    text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  rating      int not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- Reviews are public content: anyone (signed out included) can read them.
drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read" on public.reviews
  for select using (true);

drop policy if exists "reviews: insert reviewer" on public.reviews;
create policy "reviews: insert reviewer" on public.reviews
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.user_id = auth.uid()
        and b.venue_id = reviews.venue_id
        and b.status = 'confirmed'
        and b.event_date <= current_date
    )
  );

drop policy if exists "reviews: update own" on public.reviews;
create policy "reviews: update own" on public.reviews
  for update using (user_id = auth.uid());

drop policy if exists "reviews: delete own" on public.reviews;
create policy "reviews: delete own" on public.reviews
  for delete using (user_id = auth.uid());

create index if not exists reviews_venue_idx on public.reviews (venue_id, created_at desc);
