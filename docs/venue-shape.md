# The Shared Venue Shape

Seed venues (`data/venues.js`) and DB venues (`normalizeVenue`) **must produce the same object shape** so every component renders both interchangeably:

```
{
  id, ownerId, name, city, area, types[],
  capacity, pricePerHour, priceUnit, includedHours,
  rating, reviews, badge,
  host { name, type, ... },
  amenities[], images[], blurb, status
}
```

## Pricing model

- `pricePerHour` is the generic **rate** (the DB column is still named `price_per_hour`)
- `priceUnit` is `'hour' | 'head' | 'event'` and decides the booking math:
  - `hour` → rate × hours
  - `head` → rate × guests
  - `event` → flat rate
- `includedHours` (optional, head/event only) is a fixed duration the rate covers — when set, the booking's duration field is **locked** to it and price is unaffected by hours

## Host listings vs seed venues

- Host-created venues set `rating: null`, `reviews: 0`, `isHostListing: true`
- New listings show "New on Gathr" / "No reviews yet" instead of borrowing seed venues' ratings
- Seed-venue reviews are labeled "Sample reviews shown for this preview."
- **Real reviews** (from completed bookings) change this: VenuesContext merges `fetchReviewStats()` into host listings (real rating + count, badge dropped), and the venue page renders real review cards
- Seed venues keep their curated numbers (no owner → no real reviews possible)

## Field notes

- `area` is `null` when blank — render as `{area ? area+', ' : ''}{city}` to avoid a stray comma
- `host.type` is `'individual'` or `'business'`; the venue page shows "Business host" / "Individual host"
- `ownerId` is intentionally readable via the `venues: public read` policy: the venue page uses it to detect "this is my own listing" (shows the edit link / "Your listings" back nav). It is a non-PII UUID, and the own-listing UX depends on it — do not strip it from `normalizeVenue` or the public select.
- Money is stored as **integer pesos** (`total_php int`, `price_per_hour int`). PHP pricing for venue rentals is whole-peso; centavos aren't required. The booking math (`subtotal + serviceFee`) stays integer. If fractional pricing is ever needed, migrate both columns to `numeric(12,2)` and adjust `peso()`.

## Schema hardening (v5)

`supabase/v5-schema.sql` adds the integrity rules the marketplace relies on — read its header before applying:
- `venue_id` is `uuid` with a real FK → `venues(id) on delete cascade` (no orphans on venue delete)
- booking insert policy forces `status='requested'`, `total_php > 0`, and a live-venue existence check
- booking host-update policy has a `WITH CHECK`; a trigger forbids mutating `user_id`/`venue_id`/`total_php`
- a `BEFORE UPDATE` trigger enforces status transitions (requested→confirmed|declined|cancelled, confirmed→completed|cancelled)
- CHECK enums on `bookings.status`, `venues.status`, `venues.host_type`, `venues.price_unit` (added `NOT VALID` — run `validate constraint` after data cleanup)

## Adding a venue field (4-place change + DDL)

1. Seed objects in `data/venues.js`
2. `normalizeVenue` in `lib/venues.js`
3. Host wizard (`pages/HostNew.jsx`)
4. Edit form (`pages/HostEdit.jsx`) + their create/update payloads
5. `ALTER TABLE` in Supabase SQL editor (DDL can't run from the app)
