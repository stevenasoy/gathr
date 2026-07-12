# Context Providers & State

## Provider layering (order matters)

`apps/web/src/main.jsx` wraps the app in nested context providers, and the order is a dependency order:

```
BrowserRouter > ModeProvider > AuthProvider > VenuesProvider > SavedProvider > NotificationsProvider > App
```

`SavedProvider` and `NotificationsProvider` depend on `useAuth`. Don't reorder without checking those dependencies.

## Five contexts are the app's spine (`src/context/`)

### AuthContext
Supabase auth. Exposes `user`, `displayName`, `loading`, `configured`, and `signUp/signIn/signOut`. Email+password only (no OAuth wired).

### VenuesContext
**The catalog source of truth.** It merges the static seed venues (`src/data/venues.js`) with live host-created venues from the Supabase `venues` table, and exposes `venues` (merged), `dbVenues`, `findVenue(id)`, and `refresh()`.

**Pages must read venues from `useVenues()`, never import `VENUES` directly** (only VenuesContext does that). `refresh()` is called after a host publishes/edits/unlists/deletes so the catalog updates without a reload. `fetchPublicVenues` only returns `status='live'` rows, so unlisted venues never reach the public catalog.

### SavedContext
Saved/favorite venues. **DB-backed when logged in, localStorage when a guest**, and it migrates any guest saves into the DB on sign-in. Components use `useSaved()` (`isSaved`, `toggle`), never touch storage directly.

### NotificationsContext
Host-only. Tracks the count of pending (`requested`) bookings on the host's venues and bumps it in **realtime** via a Supabase channel on `bookings` INSERTs. Exposes `count`, `pending`, `refresh()`. The header bell reads `count`. `useNotifications()` returns a safe `{count:0,...}` fallback when no provider is present.

### ModeContext
The sticky Host/Gatherer mode. `{ mode, setMode }` where `mode` is `'hosting'` or `'traveling'`, persisted to localStorage (`gathr.mode`).

Entering a `/host/*` workspace route sets `'hosting'`; "Switch to gathering" / sign-out sets `'traveling'`. The header, drawer, logo target, and footer CTA all read it so the whole shell stays in one mode across shared routes (resources, pricing).
