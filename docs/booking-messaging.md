# Booking & Messaging

## Booking detail (`pages/BookingDetail.jsx`)

`/bookings/:id` — the shared booking application both sides open when they click a booking (Gatherer from `/bookings`, Host from any dashboard list).

**Role is inferred:** `b.user_id === user.id` → Gatherer, else Host (RLS only returns bookings you're party to).

Shows:
- Venue photos (from catalog, or `fetchVenue` for a Host's own unlisted venue)
- Date/duration/guests/event-type
- Special-requests note
- Total price
- Role-appropriate actions:
  - **Gatherer** can cancel only while `requested`
  - **Host** gets Confirm/Decline while `requested`

The "Message" button is role-aware:
- Gatherer → `/messages?b=<id>`
- Host → `/host/dashboard?tab=messages&b=<id>`

## Messaging (`pages/Messages.jsx`)

One reusable component, two entry points:
- Guest route `/messages` (`role="guest"`)
- Host dashboard tab (`role="host" embedded`)

### Thread types

Threads are **bookings** *and* **conversations** (pre-booking inquiries):
- A guest sees their bookings + their inquiries
- A host sees requests on their venues + inquiries on their venues

Each thread carries a `col` (`'booking_id'` | `'conversation_id'`) + `refId`.

### Deep linking

Open a specific thread with `?b=<bookingId>` or `?c=<conversationId>`.

### Thread details

- **Booking threads** pin a booking summary card at the top (status, date, guests, total, note, link to detail)
- **Inquiry threads** show "Inquiry · no booking yet"

### Implementation notes

- Sends are optimistic + deduped by id
- The wrapper around the inbox is a **plain function, not an inline component** — defining a component inside render remounts the input and drops focus on every keystroke
- Realtime requires `messages` (and `conversations`) in the `supabase_realtime` publication
