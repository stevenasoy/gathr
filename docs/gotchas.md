# Gotchas & Pitfalls

## Icons — no barrel imports

Never `import * as Icons from 'lucide-react'` — dynamic access defeats tree shaking and ships the whole icon library (~850 kB). Use the maps in `src/lib/icons.js` (`categoryIcon(name)` / `amenityIcon(label)`); a new category or amenity icon must be added there by hand.

## Routes are lazy-loaded

In `App.jsx` (Home is the only eager page). A new page needs:
1. A `lazy(() => import(...))` entry
2. A `<Route>` element
3. A title in the `TITLES` map

Pages with dynamic titles call `usePageTitle` from `src/lib/title.js` instead — prefix matches in `TITLES` are overridden by it. The `*` catch-all renders `pages/NotFound.jsx`.

## ScrollToTop & ErrorBoundary

- `ScrollToTop` (in `App.jsx`) resets window scroll on every pathname change, skipping hash links.
- `ErrorBoundary` wraps `<App />` in `main.jsx`.

## Environment variables

After editing `.env`, **restart `npm run dev`** — Vite only reads `.env` at startup.

## HMR quirk

Editing `main.jsx` or `App.jsx` (importing a not-yet-created page) puts Vite's HMR into a broken state that persists even after the file exists — restart the dev server to clear it. Accumulated `?t=…` errors in the console after heavy editing are stale; the live state is healthy if the page actually renders.

## Headless browser / automation

The headless preview/browser-automation harness hangs on the supabase-js client (its internal lock stalls there), so authed flows (sign-in, dashboard, messaging) can't be exercised that way even though the raw Supabase REST API works. Verify authed features in a real browser; `npm run build` + the public shell are the automated checks.

## Images

- Venue card images are Unsplash URLs with an `onError` gradient fallback; broken links degrade rather than break layout.
- Host photos: real file upload via `components/PhotoManager.jsx` (wizard step 5 + edit form) backed by the `venue-photos` bucket; pasting URLs still works as a secondary path.

## Adding a venue field

A 4-place change (seed data, `normalizeVenue`, wizard, edit form) **plus** an `ALTER TABLE` in Supabase. See [venue-shape.md](venue-shape.md) for details.
