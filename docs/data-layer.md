# Data Layer (`src/lib/`)

## supabase.js
The Supabase client + `isSupabaseConfigured`. When the vars are missing, `isSupabaseConfigured` is `false` and the app still runs: auth and DB calls no-op gracefully and the auth pages show a "not connected" notice.

## venues.js
- `fetchPublicVenues` (live only) / `fetchMyVenues` (owner, any status) / `fetchVenue(id)` / `createVenue` / `updateVenue` / `deleteVenue` / `setVenueStatus`
- **`normalizeVenue`** — maps a DB row into the seed-venue shape
- **`unitWord(unit)`** — price-unit display suffix

## bookings.js
- Guest side: `createBooking` / `listBookings` / `cancelBooking` / `fetchBooking`
- Host side: `listRequestsForVenues` / `setBookingStatus`

## conversations.js
Pre-booking inquiries (guest↔host, no booking):
- `getOrCreateConversation(venueId, venueName, guestId)` — idempotent upsert on `(venue_id, guest_id)`
- `listConversationsForGuest`
- `listConversationsForVenues`

## storage.js
`uploadVenuePhoto(file, userId)`: validates type/size (images, ≤5MB), uploads to the public `venue-photos` bucket at `<userId>/<timestamp>-<rand>.<ext>` (RLS requires the folder = auth.uid()), returns the public URL.

Uploaded URLs live in `venues.image_urls` alongside pasted links — downstream code can't tell them apart, by design.

## reviews.js
Real guest reviews:
- `listReviews(venueId)`
- `getReviewForBooking(bookingId)`
- `createReview(...)`
- `fetchReviewStats()` — catalog-wide `{venue_id: {count, avg}}` aggregate used by VenuesContext

## messages.js
**Thread-type-agnostic** chat. A thread is a column (`'booking_id'` or `'conversation_id'`) + id.
- `listMessages(col, id)`
- `sendMessage({col, id, senderId, body})`
- `subscribeToThread(col, id, onInsert)` — returns unsubscribe
- `fetchLatest(col, ids)` — for inbox previews
