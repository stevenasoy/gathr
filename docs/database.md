# Database & RLS (`supabase/*.sql`)

Six tables, all with Row Level Security: `saved_venues`, `bookings`, `venues`, `messages`, `conversations`, `reviews` — plus the `venue-photos` Storage bucket. The publishable key respects RLS, so **a new table without policies returns nothing** to the client.

## Table policies

### venues
- Public read gated to `status='live'`
- Owners additionally read their own at any status
- Owner-writable
- Columns: `status` ('live'|'unlisted'), `host_type` ('individual'|'business'), `price_unit` ('hour'|'head'|'event'), `included_hours` (int, nullable)

### bookings
- Visible to the guest who made them *and* the host who owns the venue
- Host can update status (confirm/decline)
- **Partial unique index** (`bookings_one_confirmed_per_date`) prevents two `confirmed` bookings on the same venue+date
- **Delete policy forbids cancelling a `confirmed` booking** (`status <> 'confirmed'`) — a Gatherer can only cancel while pending
- Columns include `note` (special requests)

### conversations
- One row per `(venue_id, guest_id)` for pre-booking inquiries
- Readable/writable by that guest or the venue owner

### messages
- Belong to **a booking OR a conversation** (`booking_id` nullable, `conversation_id` added)
- Read/write allowed if you're party to whichever the message belongs to

### reviews
- One per booking (`booking_id` unique)
- Public read (anyone, signed out included)
- Insert only by the Gatherer of a **confirmed, past** booking (`status='confirmed' and event_date <= current_date`)
- Update/delete own only
- `author_name` is denormalized from displayName at insert

### venue-photos bucket
- Public read
- Insert/delete only into the caller's own folder (`(storage.foldername(name))[1] = auth.uid()::text`)
- 5MB and image-mime limits enforced bucket-side too

## Realtime

`bookings`, `messages`, `conversations` are in the `supabase_realtime` publication; events respect RLS.

## Schema migration history

Schema is split across files — run them in order:

| File | What it adds |
|---|---|
| `schema.sql` | `saved_venues` + `bookings` |
| `host-schema.sql` | `venues` + host booking policies + unique index |
| `v2-schema.sql` | status, host_type, price_unit, included_hours, `messages`, realtime, cancel-confirmed policy |
| `v3-schema.sql` | `conversations` + nullable booking_id/conversation_id on messages + their realtime |
| `v4-schema.sql` | `venue-photos` bucket + policies, `reviews` table |

All five are applied to the live project (v4 applied 2026-06-11).

**DDL cannot be run from the app** — the publishable key can't alter schema. Schema changes are applied by hand in the Supabase SQL editor; after adding a column to a payload, run the matching `ALTER TABLE` or inserts will error.
