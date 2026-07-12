-- Gathr seed data — demo host + gatherer, sample venues, bookings, a review.
-- For LOCAL + TEST runs only. Never apply to production as-is: the auth.users
-- rows below require the matching users to exist in Supabase Auth first, and
-- the UUIDs are placeholders you must replace with real auth.users ids.
--
-- Recommended workflow: create the two users in Supabase (Auth → Users), copy
-- their ids, then replace DEMO_HOST_ID / DEMO_GATHERER_ID below and run this.

-- :host_id      := '00000000-0000-0000-0000-000000000001'  -- replace
-- :gatherer_id := '00000000-0000-0000-0000-000000000002'  -- replace

-- ============ Venues (owned by the demo host) ============
insert into public.venues
  (owner_id, name, city, area, types, capacity, price_per_hour, blurb, amenities, image_urls, host_name, host_type, price_unit, status)
values
  ('00000000-0000-0000-0000-000000000001', 'The Glass House', 'Cebu City', 'Lahug',
    array['wedding','corporate'], 120, 5000, 'Rooftop skyline views with a built-in bar.',
    array['Parking','Bar','Sound system'],
    array['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=80'],
    'Mara R.', 'individual', 'hour', 'live'),
  ('00000000-0000-0000-0000-000000000001', 'Bahay Kuban Garden', 'Tagaytay', null,
    array['wedding'], 80, 3500, 'Open-air garden for intimate ceremonies.',
    array['Parking','Garden'],
    array['https://images.unsplash.com/photo-1464366401126-1b5ed92bb49b?auto=format&fit=crop&w=900&q=80'],
    'Mara R.', 'individual', 'hour', 'live')
on conflict (id) do nothing;

-- ============ A requested booking by the demo gatherer on the first venue ============
-- Replace the venue_id with the actual id of 'The Glass House' after insert.
insert into public.bookings
  (user_id, venue_id, venue_name, event_type, event_date, hours, guests, total_php, status, note)
select
  '00000000-0000-0000-0000-000000000002',
  v.id,
  v.name,
  'Wedding',
  (current_date + 30)::date,
  5,
  100,
  v.price_per_hour * 5,
  'requested',
  'Please allow setup the night before.'
from public.venues v
where v.name = 'The Glass House'
on conflict do nothing;