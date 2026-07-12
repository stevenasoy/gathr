# Host Features

## Host / guest model

Everyone is a **guest by default**. "Host" is **derived, not stored**: a user is a host if they own at least one venue — `dbVenues.some(v => v.ownerId === user.id)`. There is no `is_host` column.

The header (`components/Header.jsx`) flips its nav on this: guests see "Become a host", hosts see "Host dashboard". A host is **per-listing** identified as an individual or a business (`host_type` + `host_name` on the venue) — there is no account-level profile yet.

Listing a venue requires an account — `/host/new`, `/host/edit/:id`, and `/host/dashboard` gate on `user`.

## Host onboarding wizard (`pages/HostNew.jsx`)

A single-component, multi-step wizard modeled on Airbnb's host flow:
- Intro (step 0) plus 3 phases across steps 1–10
- Steps: event types → location → capacity → amenities → photos → name → description → price → **who's hosting (individual/business)** → review/publish
- Segmented bottom progress bar and per-step `canNext` validation
- `PHASES`/`LAST` must stay in sync if you add/remove steps
- Publishing calls `createVenue`, then `refresh()`, then routes to the new venue

## Host edit form (`pages/HostEdit.jsx`)

`/host/edit/:id` — the **single-page** counterpart for editing an existing listing (no wizard). Fetches via `fetchVenue`, guards `ownerId === user.id`, and saves via `updateVenue`. Keep its fields in sync with the wizard's.

## Host workspace / dashboard (`pages/HostDashboard.jsx`)

A tabbed workspace at `/host/dashboard` (tabs are deep-linkable via `?tab=`):

| Tab | Description |
|---|---|
| **Today** | Today/Upcoming pills — pending-request inbox with confirm/decline + events today, and upcoming confirmed |
| **Calendar** | Month grid from booking dates, color-coded |
| **Bookings** | Full history with All/Pending/Confirmed/Completed/Cancelled filter pills; "Completed" is derived = confirmed && past date |
| **Listings** | Cards with Live/Unlisted badge, Edit, List/Unlist toggle, View, Delete |
| **Messages** | Renders `<Messages role="host" embedded />` |
| **Switch to gathering** | Sets mode `'traveling'`, goes to `/` |

Notes:
- `load()` is wrapped in try/catch/finally so the `loading` gate always clears
- Deleting a venue first cancels its active bookings (no orphans), behind a `confirm()`
- Request rows link to the booking detail, not the venue
