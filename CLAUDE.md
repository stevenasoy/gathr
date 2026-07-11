# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gathr is a two-sided marketplace for booking **event venues** (weddings, corporate offsites, parties, workshops, shoots) in the Philippines. It started as an Airbnb-homepage rebuild and grew into a working app with real accounts, saved venues, bookings (per-hour / per-head / per-event pricing), a full host workspace (create/edit/unlist listings, request inbox, calendar, bookings history), per-booking detail pages, live messaging including **pre-booking inquiries**, and realtime notifications. The two sides are **Host** (lists venues) and **Gatherer** (books them). Prices are in PHP (₱).

## Commands

```bash
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # production build to dist/
npm run preview  # serve the built dist/
npm run lint     # ESLint (flat config in eslint.config.js)
```

There is **no test suite**. "Verify it works" means `npm run lint` + `npm run build` (catches all import/syntax errors across the ~1600-module graph) plus loading the dev server in a browser. Lint covers `src/` only (video-ad/ and interactive-demo/ are separate sub-projects); `react-hooks/set-state-in-effect` is intentionally off — the app syncs state from the URL/props in effects by design (see eslint.config.js).

## Environment

`.env` (gitignored) holds Supabase credentials, read by `src/lib/supabase.js`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...   # holds the new-style sb_publishable_... key, despite the name
```

Vite only reads `.env` at startup — **restart the dev server after editing it**. When the vars are missing, `isSupabaseConfigured` is `false` and the app still runs: auth and DB calls no-op gracefully and the auth pages show a "not connected" notice.

## Architecture

### Provider layering (order matters)

`src/main.jsx` wraps the app in nested context providers, and the order is a dependency order:

```
BrowserRouter > ModeProvider > AuthProvider > VenuesProvider > SavedProvider > NotificationsProvider > App
```

`SavedProvider` and `NotificationsProvider` depend on `useAuth`. Don't reorder without checking those dependencies.

### Five contexts are the app's spine (`src/context/`)

- **AuthContext** — Supabase auth. Exposes `user`, `displayName`, `loading`, `configured`, and `signUp/signIn/signOut`. Email+password only (no OAuth wired).
- **VenuesContext** — **the catalog source of truth.** It merges the static seed venues (`src/data/venues.js`) with live host-created venues from the Supabase `venues` table, and exposes `venues` (merged), `dbVenues`, `findVenue(id)`, and `refresh()`. **Pages must read venues from `useVenues()`, never import `VENUES` directly** (only VenuesContext does that). `refresh()` is called after a host publishes/edits/unlists/deletes so the catalog updates without a reload. `fetchPublicVenues` only returns `status='live'` rows, so unlisted venues never reach the public catalog.
- **SavedContext** — saved/favorite venues. **DB-backed when logged in, localStorage when a guest**, and it migrates any guest saves into the DB on sign-in. Components use `useSaved()` (`isSaved`, `toggle`), never touch storage directly.
- **NotificationsContext** — host-only. Tracks the count of pending (`requested`) bookings on the host's venues and bumps it in **realtime** via a Supabase channel on `bookings` INSERTs. Exposes `count`, `pending`, `refresh()`. The header bell reads `count`. `useNotifications()` returns a safe `{count:0,...}` fallback when no provider is present.
- **ModeContext** — the sticky Host/Gatherer mode. `{ mode, setMode }` where `mode` is `'hosting'` or `'traveling'`, persisted to localStorage (`gathr.mode`). Entering a `/host/*` workspace route sets `'hosting'`; "Switch to gathering" / sign-out sets `'traveling'`. The header, drawer, logo target, and footer CTA all read it so the whole shell stays in one mode across shared routes (resources, pricing).

### Data layer (`src/lib/`)

- `supabase.js` — the client + `isSupabaseConfigured`.
- `venues.js` — `fetchPublicVenues` (live only) / `fetchMyVenues` (owner, any status) / `fetchVenue(id)` / `createVenue` / `updateVenue` / `deleteVenue` / `setVenueStatus`, plus **`normalizeVenue`** (maps a DB row into the seed-venue shape) and **`unitWord(unit)`** (price-unit display suffix).
- `bookings.js` — guest side (`createBooking / listBookings / cancelBooking / fetchBooking`) and host side (`listRequestsForVenues / setBookingStatus`).
- `conversations.js` — pre-booking inquiries (guest↔host, no booking): `getOrCreateConversation(venueId, venueName, guestId)` (idempotent upsert on `(venue_id, guest_id)`), `listConversationsForGuest`, `listConversationsForVenues`.
- `storage.js` — `uploadVenuePhoto(file, userId)`: validates type/size (images, ≤5MB), uploads to the public `venue-photos` bucket at `<userId>/<timestamp>-<rand>.<ext>` (RLS requires the folder = auth.uid()), returns the public URL. Uploaded URLs live in `venues.image_urls` alongside pasted links — downstream code can't tell them apart, by design.
- `reviews.js` — real guest reviews: `listReviews(venueId)`, `getReviewForBooking(bookingId)`, `createReview(...)`, and `fetchReviewStats()` (catalog-wide `{venue_id: {count, avg}}` aggregate used by VenuesContext).
- `messages.js` — **thread-type-agnostic** chat. A thread is a column (`'booking_id'` or `'conversation_id'`) + id. `listMessages(col,id)`, `sendMessage({col,id,senderId,body})`, `subscribeToThread(col,id,onInsert)` (returns unsubscribe), `fetchLatest(col,ids)` for inbox previews.

### The shared venue shape

Seed venues (`data/venues.js`) and DB venues (`normalizeVenue`) **must produce the same object shape** so every component renders both interchangeably:
`{ id, ownerId, name, city, area, types[], capacity, pricePerHour, priceUnit, includedHours, rating, reviews, badge, host{name,type,...}, amenities[], images[], blurb, status }`.

`pricePerHour` is the generic **rate** (the DB column is still named `price_per_hour`); `priceUnit` is `'hour' | 'head' | 'event'` and decides the booking math: hour → rate×hours, head → rate×guests, event → flat. `includedHours` (optional, head/event only) is a fixed duration the rate covers — when set, the booking's duration field is **locked** to it and price is unaffected by hours.

Host-created venues set `rating: null`, `reviews: 0`, `isHostListing: true`. The UI keys off this for an **honesty convention**: new listings show "New on Gathr" / "No reviews yet" instead of borrowing the seed venues' ratings and testimonials. Seed-venue reviews are labeled "Sample reviews shown for this preview." **Real reviews** (from completed bookings) change this: VenuesContext merges `fetchReviewStats()` into host listings (real rating + count, badge dropped), and the venue page renders real review cards — a real review always beats samples. Seed venues keep their curated numbers (no owner → bookings can't be confirmed → no real reviews possible). `area` is `null` when blank — render it as `{area ? area+', ' : ''}{city}` to avoid a stray comma or "City, City". `host.type` is `'individual'` or `'business'`; the venue page shows "Business host" / "Individual host".

**When adding a public-facing venue field, update three places:** the seed objects in `data/venues.js`, `normalizeVenue` in `lib/venues.js`, and **both** the host wizard (`pages/HostNew.jsx`) and the edit form (`pages/HostEdit.jsx`) + their create/update payloads. A new DB column also needs an `alter table` run by hand (see Database below).

### Vocabulary (use these exact role names in UI copy)

- **Host** — the supply side; lists and manages venues. UI: "Become a Host", "Host dashboard", "message the Host", "For Hosts", "Host resources".
- **Gatherer** — the demand side; books a venue to gather their people (the brand pun on "Gathr"). Use "Gatherer(s)" in copy that refers to the booker, not "guest/organizer/renter/traveler".
- **Mode labels:** the Host workspace shows "Hosting"; the toggle back to the booking experience reads "Switch to gathering". (Internal mode values in `ModeContext`/localStorage are still `'hosting'`/`'traveling'` — not user-visible; don't rename them.)
- Do **not** use Airbnb's "traveler/traveling" or generic "venue owner / organizer" in UI copy — the canonical pair is **Host ↔ Gatherer**.

### Host / guest model

Everyone is a **guest by default**. "Host" is **derived, not stored**: a user is a host if they own at least one venue — `dbVenues.some(v => v.ownerId === user.id)`. There is no `is_host` column. The header (`components/Header.jsx`) flips its nav on this: guests see "Become a host", hosts see "Host dashboard". A host is **per-listing** identified as an individual or a business (`host_type` + `host_name` on the venue) — there is no account-level profile yet. Listing a venue requires an account — `/host/new`, `/host/edit/:id`, and `/host/dashboard` gate on `user`.

### Host onboarding wizard + edit

`pages/HostNew.jsx` is a single-component, multi-step wizard modeled on Airbnb's host flow: an intro (step 0) plus 3 phases across steps 1–10 (event types → location → capacity → amenities → photos → name → description → price → **who's hosting (individual/business)** → review/publish), with a segmented bottom progress bar and per-step `canNext` validation. `PHASES`/`LAST` must stay in sync if you add/remove steps. Publishing calls `createVenue`, then `refresh()`, then routes to the new venue.

`pages/HostEdit.jsx` (`/host/edit/:id`) is the **single-page** counterpart for editing an existing listing (no wizard). It fetches via `fetchVenue`, guards `ownerId === user.id`, and saves via `updateVenue`. Keep its fields in sync with the wizard's.

### Host workspace (`pages/HostDashboard.jsx`)

A tabbed workspace at `/host/dashboard` (tabs are deep-linkable via `?tab=`): **Today** (Today/Upcoming pills — pending-request inbox with confirm/decline + events today, and upcoming confirmed), **Calendar** (month grid from booking dates, color-coded), **Bookings** (full history with All/Pending/Confirmed/Completed/Cancelled filter pills; "Completed" is derived = confirmed && past date), **Listings** (cards with Live/Unlisted badge, Edit, List/Unlist toggle, View, Delete), **Messages** (renders `<Messages role="host" embedded />`), plus **Switch to gathering** (sets mode `'traveling'`, goes to `/`). `load()` is wrapped in try/catch/finally so the `loading` gate always clears. Deleting a venue first cancels its active bookings (no orphans), behind a `confirm()`. Request rows link to the booking detail, not the venue.

### Booking detail (`pages/BookingDetail.jsx`)

`/bookings/:id` — the shared booking application both sides open when they click a booking (Gatherer from `/bookings`, Host from any dashboard list). Role is **inferred**: `b.user_id === user.id` → Gatherer, else Host (RLS only returns bookings you're party to). Shows venue photos (from catalog, or `fetchVenue` for a Host's own unlisted venue), date/duration/guests/event-type, special-requests note, total, and role-appropriate actions: Gatherer can cancel only while `requested`; Host gets Confirm/Decline while `requested`. The "Message" button is role-aware — Gatherer → `/messages?b=<id>`, Host → `/host/dashboard?tab=messages&b=<id>` (so each lands in the inbox that actually loads that thread).

### Messaging (`pages/Messages.jsx`)

One reusable component, two entry points: the guest route `/messages` (`role="guest"`) and the host dashboard tab (`role="host" embedded`). Threads are **bookings** *and* **conversations** (pre-booking inquiries): a guest sees their bookings + their inquiries; a host sees requests on their venues + inquiries on their venues. Each thread carries a `col` (`'booking_id'`|`'conversation_id'`) + `refId`; the view loads/sends/subscribes by that pair. Deep-link a thread with `?b=<bookingId>` or `?c=<conversationId>`. Booking threads pin a **booking summary card** at the top (status, date, guests, total, note, link to detail); inquiry threads show "Inquiry · no booking yet". Sends are optimistic + deduped by id. **Note:** the wrapper around the inbox is a plain function, not an inline component — defining a component inside render remounts the input and drops focus on every keystroke. Realtime requires `messages` (and `conversations`) in the `supabase_realtime` publication.

### Database & RLS (`supabase/*.sql`)

Six tables, all with Row Level Security: `saved_venues`, `bookings`, `venues`, `messages`, `conversations`, `reviews` — plus the `venue-photos` Storage bucket. The publishable key respects RLS, so **a new table without policies returns nothing** to the client.

Key rules:
- **venues** — public read is gated to `status='live'`; owners additionally read their own at any status; owner-writable. Columns: `status` ('live'|'unlisted'), `host_type` ('individual'|'business'), `price_unit` ('hour'|'head'|'event'), `included_hours` (int, nullable).
- **bookings** — visible to the guest who made them *and* the host who owns the venue; host can update status (confirm/decline). A **partial unique index** (`bookings_one_confirmed_per_date`) prevents two `confirmed` bookings on the same venue+date. The **delete policy forbids cancelling a `confirmed` booking** (`status <> 'confirmed'`) — a Gatherer can only cancel while pending. Columns include `note` (special requests).
- **conversations** — one row per `(venue_id, guest_id)` for pre-booking inquiries; readable/writable by that guest or the venue owner.
- **messages** — belong to **a booking OR a conversation** (`booking_id` nullable, `conversation_id` added). Read/write allowed if you're party to whichever the message belongs to.
- **reviews** — one per booking (`booking_id` unique). Public read (anyone, signed out included). Insert only by the Gatherer of a **confirmed, past** booking (`status='confirmed' and event_date <= current_date` — the same rule the dashboard uses for "Completed"); update/delete own only. `author_name` is denormalized from displayName at insert.
- **venue-photos bucket** — public read; insert/delete only into the caller's own folder (`(storage.foldername(name))[1] = auth.uid()::text`); 5MB and image-mime limits enforced bucket-side too.
- **Realtime** — `bookings`, `messages`, `conversations` are in the `supabase_realtime` publication; events respect RLS.

Schema is split across `supabase/schema.sql` (saved + bookings), `host-schema.sql` (venues + host booking policies + unique index), `v2-schema.sql` (status, host_type, price_unit, included_hours, messages, realtime, cancel-confirmed policy), `v3-schema.sql` (conversations + nullable booking_id/conversation_id on messages + their realtime), and `v4-schema.sql` (venue-photos bucket + policies, reviews table). Run them in order. All five are applied to the live project (v4 applied 2026-06-11). **DDL cannot be run from the app** — the publishable key can't alter schema. Schema changes are applied by hand in the Supabase SQL editor; after adding a column to a payload, run the matching `alter table` or inserts will error.

## Styling

One global stylesheet, `src/index.css`, driven by CSS custom properties. No Tailwind, no CSS modules. Brand: ultraviolet `--brand #6c2bd9` to magenta `--brand-2 #e0218a` gradient, gold `--gold` for ratings, light theme (`--bg #fbfaf8`). Fonts: Plus Jakarta Sans (display/headings) + Inter (body), loaded in `index.html`.

## Gotchas

- **Icons:** never `import * as Icons from 'lucide-react'` — dynamic access defeats tree shaking and ships the whole icon library (~850 kB of bundle). Use the maps in `src/lib/icons.js` (`categoryIcon(name)` / `amenityIcon(label)`); a new category or amenity icon must be added there by hand.
- **Routes are lazy-loaded** in `App.jsx` (Home is the only eager page). A new page needs a `lazy(() => import(...))` entry, a `<Route>`, and a title in the `TITLES` map (pages with dynamic titles call `usePageTitle` from `src/lib/title.js` instead — prefix matches in `TITLES` are overridden by it). The `*` catch-all renders `pages/NotFound.jsx`.
- `ScrollToTop` (in `App.jsx`) resets window scroll on every pathname change, skipping hash links. `ErrorBoundary` wraps `<App />` in `main.jsx`.
- After editing `.env`, restart `npm run dev`.
- Editing `main.jsx` or `App.jsx` (importing a not-yet-created page) puts Vite's HMR into a broken state that persists even after the file exists — restart the dev server to clear it. Accumulated `?t=…` errors in the console after heavy editing are stale; the live state is healthy if the page actually renders.
- **The headless preview/browser-automation harness hangs on the supabase-js client** (its internal lock stalls there), so authed flows (sign-in, dashboard, messaging) can't be exercised that way even though the raw Supabase REST API works. Verify authed features in a real browser; `npm run build` + the public shell are the automated checks.
- Venue card images are Unsplash URLs with an `onError` gradient fallback; broken links degrade rather than break layout.
- Host photos: real file upload via `components/PhotoManager.jsx` (wizard step 5 + edit form) backed by the `venue-photos` bucket; pasting URLs still works as a secondary path.
- Adding a venue field is a 4-place change (seed data, `normalizeVenue`, wizard, edit form) **plus** an `alter table` in Supabase.
