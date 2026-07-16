# API and Authentication Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Express API reject forged identity/workflow data, revoke sessions correctly, validate JWT context, bound inputs/queries, and use the database security surfaces introduced by v10.

**Architecture:** Keep the current user-scoped Supabase client so RLS remains authoritative. Tighten the existing Zod schemas and route payloads, replace destructive operations with state updates, and reuse the existing Vitest/Supertest test harness instead of introducing another API framework.

**Tech Stack:** Node.js 24, Express 5, TypeScript, Zod 3, Supabase JS 2, jose 5, Vitest 3, Supertest 7.

## Global Constraints

- Complete the database/RLS plan first; this plan consumes v10 columns, views, triggers, and RPCs.
- Repository-only: no remote Supabase calls outside mocked/local tests.
- Preserve the current visual design and the user's uncommitted color changes.
- Do not accept `total_php`, `venue_name`, `status`, `user_id`, `venue_id`, or `author_name` when the database can derive them.
- Cookies are `HttpOnly`, `SameSite=Lax`, and secure outside explicit development/test.
- Production password-reset redirects use only `WEB_ORIGIN`; hostile request headers never influence them.
- Keep the current in-memory rate limiter and document one API replica as its ceiling.

---

### Task 1: Bound and canonicalize every write schema

**Files:**
- Create: `apps/api/src/lib/validation.test.ts`
- Modify: `apps/api/src/lib/validation.ts`
- Modify: `apps/api/src/routes/bookings.ts`
- Modify: `apps/api/src/routes/reviews.ts`
- Modify: `apps/api/src/routes/conversations.ts`
- Modify: `apps/api/src/routes/messages.ts`
- Modify: `apps/api/src/routes/venues.ts`
- Test: `apps/api/src/lib/validation.test.ts`

**Interfaces:**
- Produces: `CreateBookingSchema`, `CreateReviewSchema`, `CreateMessageSchema`, `LatestMessagesSchema`, `CreateConversationSchema`, `CreateVenueSchema`, and auth schemas with stripped unknown keys.
- Consumed by: Tasks 2-4.

- [ ] **Step 1: Write the failing boundary tests**

Cover exact accepted/rejected payloads:

```ts
import { describe, expect, it } from 'vitest'
import {
  CreateBookingSchema,
  CreateMessageSchema,
  CreateReviewSchema,
  CreateVenueSchema,
  LatestMessagesSchema,
  SignUpSchema,
} from './validation.js'

describe('security validation limits', () => {
  it('strips forged booking fields', () => {
    const value = CreateBookingSchema.parse({
      venue_id: '10000000-0000-0000-0000-000000000001',
      event_date: '2026-08-01', hours: 4,
      total_php: 1, venue_name: 'forged', status: 'confirmed', user_id: 'forged',
    })
    expect(value).toEqual({
      venue_id: '10000000-0000-0000-0000-000000000001',
      event_date: '2026-08-01', hours: 4,
    })
  })

  it('strips review identity and enforces body length', () => {
    const value = CreateReviewSchema.parse({
      booking_id: '20000000-0000-0000-0000-000000000001',
      venue_id: 'forged', author_name: 'forged', user_id: 'forged', rating: 5, body: 'good',
    })
    expect(value).toEqual({
      booking_id: '20000000-0000-0000-0000-000000000001', rating: 5, body: 'good',
    })
    expect(CreateReviewSchema.safeParse({
      booking_id: '20000000-0000-0000-0000-000000000001', rating: 5, body: 'x'.repeat(4001),
    }).success).toBe(false)
  })

  it('bounds messages, arrays, and latest IDs', () => {
    expect(CreateMessageSchema.safeParse({ col: 'booking_id', id: crypto.randomUUID(), body: 'x'.repeat(5001) }).success).toBe(false)
    expect(LatestMessagesSchema.safeParse({ col: 'booking_id', ids: Array.from({ length: 201 }, () => crypto.randomUUID()) }).success).toBe(false)
    expect(CreateVenueSchema.safeParse({ name: 'x'.repeat(161) }).success).toBe(false)
    expect(CreateVenueSchema.safeParse({ name: 'ok', image_urls: Array.from({ length: 21 }, () => 'https://example.com/a.jpg') }).success).toBe(false)
  })

  it('normalizes auth email and bounds account fields', () => {
    expect(SignUpSchema.parse({ email: ' PERSON@Example.COM ', password: 'password123', name: 'Person' }).email).toBe('person@example.com')
    expect(SignUpSchema.safeParse({ email: 'person@example.com', password: 'short', name: 'Person' }).success).toBe(false)
    expect(SignUpSchema.safeParse({ email: 'person@example.com', password: 'password123', name: 'x'.repeat(121) }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm run test --workspace=apps/api -- --run src/lib/validation.test.ts`

Expected: the booking/review forged keys remain in parsed output or the length assertions accept invalid data.

- [ ] **Step 3: Implement exact shared primitives**

Add these constants and schemas, then compose the route schemas from them:

```ts
const uuid = z.string().uuid()
const shortName = z.string().trim().min(1).max(120)
const venueName = z.string().trim().min(1).max(160)
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional()
const url = z.string().url().max(2048).refine((value) => /^https?:\/\//i.test(value), 'URL must use http or https.')

export const CreateBookingSchema = z.object({
  venue_id: uuid,
  event_type: nullableText(120),
  event_date: z.string().date(),
  hours: z.number().int().min(1).max(168),
  guests: z.number().int().positive().nullable().optional(),
  note: nullableText(2000),
})

export const CreateReviewSchema = z.object({
  booking_id: uuid,
  rating: ratingSchema,
  body: nullableText(4000),
})

export const CreateMessageSchema = z.object({
  col: z.enum(['booking_id', 'conversation_id']),
  id: uuid,
  body: z.string().trim().min(1).max(5000),
})

export const LatestMessagesSchema = z.object({
  col: z.enum(['booking_id', 'conversation_id']),
  ids: z.array(uuid).max(200),
})

export const SignUpSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(1024),
  name: shortName,
})
export const SignInSchema = SignUpSchema.pick({ email: true, password: true })
export const ResetPasswordSchema = SignInSchema.pick({ email: true })
export const UpdatePasswordSchema = SignInSchema.pick({ password: true })
```

`CreateConversationSchema` uses UUID venue ID and a 160-character venue name. `CreateVenueSchema` uses the design limits: names 160/120, city/event fields 120, area 160, blurb 5,000, types 12x60, amenities 50x100, image URLs 20 validated URLs, capacity at most 100,000, price at most 100,000,000, and included hours at most 168. Parse all four auth routes with the exported auth schemas and return the existing uniform validation-error body on failure.

- [ ] **Step 4: Remove route-side derived fields**

Bookings insert `{ ...parsed.data, user_id: user.id }`; v10 derives venue name, status, and total. Reviews insert `{ booking_id, rating, body }`; v10 derives reviewer, venue, and author. Remove the now-redundant manual 200-ID block from messages because Zod owns it.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm run test --workspace=apps/api -- --run src/lib/validation.test.ts
npm run build --workspace=apps/api
```

Expected: both commands pass.

```bash
git add apps/api/src/lib/validation.ts apps/api/src/lib/validation.test.ts apps/api/src/routes/bookings.ts apps/api/src/routes/reviews.ts apps/api/src/routes/conversations.ts apps/api/src/routes/messages.ts apps/api/src/routes/venues.ts
git commit -m "fix: bound API write payloads"
```

---

### Task 2: Harden JWT, cookies, rate-limit keys, resets, and session revocation

**Files:**
- Create: `apps/api/src/middleware/auth.test.ts`
- Modify: `apps/api/src/middleware/auth.ts`
- Modify: `apps/api/src/lib/cookies.ts`
- Modify: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`
- Modify: `apps/api/src/error-handler.prod.test.ts`
- Modify: `apps/api/.env.example`
- Test: `apps/api/src/middleware/auth.test.ts`
- Test: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: exported `userFromToken(token: string): Promise<User | null>`.
- Produces: exported `normalizeEmailKey(value: unknown, fallback: string): string` and `parseTrustProxyHops(value: string | undefined): number`.
- Consumes: `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `WEB_ORIGIN`, and `TRUST_PROXY_HOPS`.

- [ ] **Step 1: Write failing JWT claim tests**

Use `SignJWT` with the configured test secret to create four HS256 tokens: valid issuer/audience/role, wrong issuer, wrong audience, and `role='service_role'`. Assert only the valid authenticated token produces a user.

```ts
const base = new SignJWT({ email: 'person@example.com', role: 'authenticated' })
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject('10000000-0000-0000-0000-000000000001')
  .setIssuedAt()
  .setExpirationTime('5m')

const token = await base
  .setIssuer('https://fake-test.supabase.co/auth/v1')
  .setAudience('authenticated')
  .sign(new TextEncoder().encode(TEST_SECRET))
expect((await userFromToken(token))?.id).toBe('10000000-0000-0000-0000-000000000001')
```

Expected before implementation: the wrong issuer/audience/role tokens are accepted because only signature and subject are checked.

- [ ] **Step 2: Verify all mandatory JWT claims**

Make `userFromToken` test-exported and pass exact jose options:

```ts
const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET), {
  algorithms: ['HS256'],
  issuer: `${SUPABASE_URL}/auth/v1`,
  audience: 'authenticated',
})
if (!payload.sub || payload.role !== 'authenticated') return null
```

Retain the existing Supabase `getUser()` fallback when local verification is unavailable or rejects a token.

- [ ] **Step 3: Add fail-safe configuration helpers**

Use the following implementations in `index.ts`:

```ts
export function parseTrustProxyHops(value: string | undefined): number {
  if (value === undefined || value === '') return 0
  const hops = Number(value)
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 10.')
  }
  return hops
}

export function normalizeEmailKey(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim()
    ? value.trim().toLowerCase()
    : fallback
}
```

Set Express trust proxy exclusively from `parseTrustProxyHops(process.env.TRUST_PROXY_HOPS)`. The email limiter key is the normalized email; its skip predicate ignores empty/non-string values.

- [ ] **Step 4: Make cookies fail secure**

Replace the production-only check with:

```ts
const secureCookies = process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test'
```

Both token-cookie option factories use `secure: secureCookies`. Add production tests asserting `Secure`, `HttpOnly`, and `SameSite=Lax` on both cookies.

- [ ] **Step 5: Pin password-reset redirects and remove enumeration**

Resolve `WEB_ORIGIN` once per request with `new URL()`. In production, reject a missing origin and reject non-HTTPS except `localhost`/`127.0.0.1`. Call `resetPasswordForEmail(email, { redirectTo: new URL('/reset-password', webOrigin).toString() })`, log provider errors server-side, and always return `202 { success: true }` for a syntactically valid email.

Add a Supertest case sending `Origin: https://evil.example` and `Host: evil.example`; inspect the mocked reset call and assert its redirect starts with `https://gathr.example/` from `WEB_ORIGIN`.

Do not forward Supabase provider messages from signup, signin, reset, or password-update routes. Use the stable client messages `Unable to create account.`, `Invalid credentials.`, the reset `202` response, and `Unable to update password.` respectively; log provider details server-side.

- [ ] **Step 6: Revoke sessions on sign-out and password change**

Sign-out reads the access cookie and calls:

```ts
if (access && supabaseAdmin) {
  const { error } = await supabaseAdmin.auth.admin.signOut(access, 'global')
  if (error) console.error('Supabase sign-out failed', error)
}
clearSessionCookies(res)
res.json({ success: true })
```

After a successful password update, call the same global revocation, clear cookies, and return `{ success: true }`. Update the web context in Task 4 to clear its in-memory user/token. Extend the Supabase mock with `auth.admin.signOut` and assert it receives the active access token.

- [ ] **Step 7: Run auth tests and commit**

Run:

```bash
npm run test --workspace=apps/api -- --run src/middleware/auth.test.ts src/index.test.ts src/error-handler.prod.test.ts
npm run build --workspace=apps/api
```

Expected: JWT, hostile-header, revocation, proxy, email-normalization, and secure-cookie cases pass.

```bash
git add apps/api/src/middleware/auth.ts apps/api/src/middleware/auth.test.ts apps/api/src/lib/cookies.ts apps/api/src/routes/auth.ts apps/api/src/index.ts apps/api/src/index.test.ts apps/api/src/error-handler.prod.test.ts apps/api/.env.example
git commit -m "fix: harden API authentication sessions"
```

---

### Task 3: Consume safe views/RPCs and replace destructive deletes

**Files:**
- Modify: `apps/api/src/routes/messages.ts`
- Modify: `apps/api/src/routes/reviews.ts`
- Modify: `apps/api/src/routes/venues.ts`
- Modify: `apps/api/src/routes/bookings.ts`
- Modify: `apps/api/src/types/db.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`
- Test: `apps/api/src/index.test.ts`

**Interfaces:**
- Consumes RPC: `latest_messages(p_thread_kind text, p_thread_ids uuid[])`.
- Consumes columns: `bookings.deleted_at`, `venues.deleted_at`.
- Consumes views: `venues_live`, `reviews_public`, `venue_review_stats`.

- [ ] **Step 1: Write failing route regression tests**

Extend the mock query recorder and assert:

```ts
expect(latestRpc).toHaveBeenCalledWith('latest_messages', {
  p_thread_kind: 'booking_id',
  p_thread_ids: [bookingA, bookingB],
})
expect(lastVenueMutation).toMatchObject({ method: 'update', values: { status: 'unlisted' } })
expect(lastBookingMutation).toMatchObject({ method: 'update', values: { status: 'cancelled' } })
expect(lastReviewInsert).toEqual({ booking_id: bookingId, rating: 5, body: 'good' })
```

Also inject PostgreSQL code `23514` and assert the API returns `422 { error: 'Invalid input.' }` without a constraint or trigger message. Expected before implementation: latest messages use `.from('messages')`, deletes call `.delete()`, review identity is included, and `23514` maps to a generic 500.

- [ ] **Step 2: Replace latest-message materialization**

Use one RPC and rebuild the response map only from its at-most-one-row-per-thread result:

```ts
const { data, error } = await r.supabase.rpc('latest_messages', {
  p_thread_kind: col,
  p_thread_ids: ids,
})
if (error) throw error
const latest = Object.fromEntries((data || []).map((row) => [row[col] as string, row]))
res.json({ latest })
```

- [ ] **Step 3: Soft-delete through state updates**

Venue DELETE updates `{ status: 'unlisted', deleted_at: new Date().toISOString() }` for the owned, non-deleted row. Booking DELETE accepts only a guest-owned `requested` booking and updates `{ status: 'cancelled', deleted_at: new Date().toISOString() }`. Normal venue/booking lists, counts, requests, and public detail filters add `.is('deleted_at', null)`.

- [ ] **Step 4: Correct authenticated public venue detail**

Always query `venues_live` first. If absent and a user exists, query the base table with both `.eq('owner_id', r.user.id)` and `.is('deleted_at', null)`. This keeps another host's public UUID private while allowing an owner to load drafts.

- [ ] **Step 5: Remove review fallback scans and role promotion**

Review stats query only `venue_review_stats`; throw its error instead of loading all reviews into Node. Remove the venue-create best-effort `profiles.role='host'` update because v10 freezes the field and ownership is the capability.

- [ ] **Step 6: Update database types**

Add `deleted_at: string | null` to venue and booking rows. Change `reviews_public` to omit both `user_id` and `booking_id`. Define the RPC result in `Database.public.Functions` with the six message fields so the route needs no `any` cast.

Map PostgreSQL `23514` check violations to status 422 and the stable `Invalid input.` response in the central error handler. Authorization triggers use SQLSTATE `42501`, so they retain the existing generic 403 mapping.

- [ ] **Step 7: Run route tests and commit**

Run:

```bash
npm run test --workspace=apps/api -- --run src/index.test.ts
npm run build --workspace=apps/api
```

Expected: safe-view, RPC, and soft-delete tests pass.

```bash
git add apps/api/src/routes/messages.ts apps/api/src/routes/reviews.ts apps/api/src/routes/venues.ts apps/api/src/routes/bookings.ts apps/api/src/types/db.ts apps/api/src/index.ts apps/api/src/index.test.ts
git commit -m "fix: use hardened database surfaces"
```

---

### Task 4: Remove forged fields from web callers and authenticate storage uploads

**Files:**
- Create: `apps/web/src/lib/__tests__/storage.test.ts`
- Modify: `apps/web/src/lib/storage.ts`
- Modify: `apps/web/src/lib/reviews.ts`
- Modify: `apps/web/src/lib/bookings.ts`
- Modify: `apps/web/src/pages/Venue.tsx`
- Modify: `apps/web/src/pages/BookingDetail.tsx`
- Modify: `apps/web/src/context/AuthContext.tsx`
- Modify: `apps/web/src/types/db.ts`
- Test: `apps/web/src/lib/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `createUserSupabase()` from `apps/web/src/lib/supabase.ts`.
- Produces: `createBooking(input: BookingRequest)` and `createReview(input: ReviewRequest)` without identity/price fields.

- [ ] **Step 1: Write the failing authenticated-storage test**

Mock `createUserSupabase` and the anonymous `supabase` export. Upload a valid image and assert the authenticated client's `storage.from('venue-photos').upload` was called while the anonymous client was untouched.

Expected before implementation: the anonymous client handles the upload.

- [ ] **Step 2: Use the authenticated storage client**

Import `createUserSupabase`, construct it after local file validation, and use that single client for both upload and `getPublicUrl`. Catch a missing token and return the existing `{ url: null, error: { message } }` shape.

- [ ] **Step 3: Narrow booking and review request types**

Define exact request types:

```ts
type BookingRequest = Pick<BookingRow, 'venue_id' | 'event_date' | 'hours'> &
  Partial<Pick<BookingRow, 'event_type' | 'guests' | 'note'>>

type ReviewRequest = {
  booking_id: string
  rating: number
  body: string | null
}
```

Venue booking submits no user, venue-name, total, or status fields. Booking detail submits no user, venue, or author fields. Keep the displayed price preview; the returned booking contains the canonical database total.

- [ ] **Step 4: Clear client auth after password changes**

Change `updatePassword` to expect `{ success: true }`, then call `setUser(null)` and `setAccessToken(null)` before returning success. The existing reset page already redirects to sign-in.

- [ ] **Step 5: Sync row types and run tests**

Add nullable `deleted_at` to web venue/booking rows and remove `booking_id` from the public-review view type.

Run:

```bash
npm run test --workspace=apps/web -- --run src/lib/__tests__/storage.test.ts
npm run build --workspace=apps/web
```

Expected: storage and TypeScript builds pass without visual snapshots changing.

```bash
git add apps/web/src/lib/storage.ts apps/web/src/lib/__tests__/storage.test.ts apps/web/src/lib/reviews.ts apps/web/src/lib/bookings.ts apps/web/src/pages/Venue.tsx apps/web/src/pages/BookingDetail.tsx apps/web/src/context/AuthContext.tsx apps/web/src/types/db.ts
git commit -m "fix: remove client-authoritative booking data"
```

---

### Task 5: Run the complete API/web regression suite

**Files:**
- Test: `apps/api/src/**/*.test.ts`
- Test: `apps/web/src/**/*.test.ts`

- [ ] **Step 1: Run all unit and build checks**

```bash
npm run test:ci --workspace=apps/api
npm run build --workspace=apps/api
npm run test:ci --workspace=apps/web
npm run build --workspace=apps/web
```

Expected: all commands exit zero, with no raw database error text or auth tokens printed.

- [ ] **Step 2: Inspect trust-boundary callers**

Run:

```bash
rg -n "total_php:|author_name:|profiles.*role|\.delete\(" apps/api/src apps/web/src
```

Expected: `total_php` and `author_name` appear only in response/display types, profile role has no user promotion write, and no venue/booking route performs a hard delete.

- [ ] **Step 3: Commit any test-only corrections**

```bash
git add apps/api apps/web
git commit -m "test: cover backend security boundaries"
```

Skip this commit when the worktree is already clean after Steps 1-2.
