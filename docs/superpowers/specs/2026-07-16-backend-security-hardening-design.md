# Backend Security Hardening Design

**Date:** 2026-07-16

**Status:** Approved for repository-only implementation

**Scope:** Supabase/PostgreSQL, API, storage access, containers, CI, and operational documentation. No live deployment and no visual redesign.

## Objective

Close every actionable finding from the backend security audit at the trust boundary where it can be enforced, add regression coverage for each exploit path, and leave an idempotent deployment path for an existing Supabase project.

## Constraints

- Preserve the current frontend design and the user's uncommitted color work.
- Do not mutate the connected Supabase project.
- Do not rewrite already-applied migrations as the live upgrade mechanism.
- A fresh install must still be able to run the documented migration sequence.
- Prefer PostgreSQL constraints, policies, and triggers over duplicate API-only checks because clients can call Supabase directly.
- Avoid new infrastructure unless the current deployment requires it.

## Chosen Approach

Use a forward corrective migration plus small API and deployment hardening changes. A critical-only patch was rejected because it leaves known authorization and data-loss paths. Replacing the schema baseline was rejected because it is unsafe for existing deployments.

The implementation will be divided into independently testable changes, but delivered as one repository hardening pass.

## Database and RLS Design

### Migration strategy

- Add `v10-security-hardening.sql` as the live upgrade path. It must be rerunnable: policies, grants, functions, triggers, views, indexes, and constraints are replaced or guarded explicitly.
- Repair the relation-type check in `v8-polish.sql` so a fresh v1-to-v10 install does not attempt `DROP MATERIALIZED VIEW` against a normal view. Existing installations receive the equivalent repair from v10.
- Update the migration ledger so v1 through v10 have one documented order. Mark the alternate review-stat script as superseded instead of presenting it as another valid head.
- Use catalog checks when a repair depends on whether an existing relation is a view or materialized view.

### Function privileges

- Revoke function execution from `PUBLIC` and `anon` unless a function is deliberately public.
- Every `SECURITY DEFINER` function must use an empty fixed `search_path` and schema-qualified object names.
- Replace `erase_message_bodies(user_id, hard_delete)` with a self-scoped implementation. An authenticated caller may anonymize only their own messages; hard deletion is allowed only to the service role. Invalid callers fail before data mutation.
- Remove obsolete review-refresh functions and their grants.

### Booking authorization and pricing

- Enforce status transitions in a database trigger using `auth.uid()` and the existing booking/venue ownership relationship:
  - guest: `requested -> cancelled` only;
  - venue owner: `requested -> confirmed|declined|cancelled`, and the existing valid completion flow;
  - service role: maintenance transitions only.
- The trigger must reject direct Supabase updates that the API would reject.
- Stop accepting `total_php` as authoritative input. A database trigger computes it from the current venue row:
  - hourly: `price_per_hour * hours`;
  - per-head: `price_per_hour * guests`;
  - per-event: `price_per_hour`;
  - total: subtotal plus the current rounded 10% service fee.
- Require positive hours, require guests for per-head pricing, enforce venue capacity, and require the configured included duration for per-head/per-event venues when one exists.
- The API may return the computed amount, but neither the browser nor a direct Supabase client can override it.

### Reviews

- Derive the review author snapshot from the authenticated user's profile; ignore client-supplied author names.
- Preserve the existing completed-booking eligibility rule in the database.
- Public review output excludes `booking_id` and user identifiers and includes reviews only for live, non-deleted venues.
- Replace full materialized-view refreshes on every review mutation with an ordinary aggregate query/view. The existing API cache is sufficient until measured review volume justifies incremental summaries.

### Public data and identifier privacy

- Revoke direct public access to sensitive base-table columns.
- Expose explicit public projections for live venues and reviews. The projections list every allowed column and contain their own live/non-deleted predicate; they do not rely on a future RLS policy remaining permissive.
- Owner, guest, and reviewer operations continue through user-scoped base-table policies or narrowly scoped functions.
- Public projections must not expose venue owner UUIDs, reviewer UUIDs, or booking UUIDs.

### Deletion and retention

- Add `deleted_at` to venues and bookings.
- Convert API deletion into soft deletion or cancellation, retaining messages, conversations, bookings, and reviews for referential integrity and auditability.
- Public and normal list queries exclude soft-deleted rows; authorized detail/history queries may still read retained records.
- Replace destructive parent foreign-key cascades with `RESTRICT` or non-destructive behavior where a parent deletion could erase another user's messages or reviews.
- Permanent erasure remains an explicit privileged maintenance operation, not a user-facing DELETE side effect.

### Storage

- Require authenticated uploads under a user-owned path prefix and fix the web upload helper to use the authenticated Supabase client.
- Enforce the existing 5 MB/image-only limits and cap each user at 100 stored venue images in the storage insert policy. Users may delete only their own objects.
- Keep venue images public because that is a product requirement; public read does not imply public write.

### Field limits

- Add matching SQL checks and API validation maxima: names/host names 120 characters, venue names/areas 160, cities/event types 120, booking notes 2,000, venue blurbs/messages 5,000, review bodies 4,000, types 12 items of 60, amenities 50 items of 100, image URLs 20 valid URLs of at most 2,048 characters, and latest-message requests 200 UUIDs.
- Freeze `profiles.role` to its server-assigned default for user-scoped writes. Hosting capability is derived from venue ownership, not trusted profile metadata.

## API and Authentication Design

- Require a configured canonical web origin in production for password-reset redirects. Never derive it from request `Origin` or `Host` headers.
- Return the same accepted response and similar code path for password-reset requests whether an account exists or not.
- Revoke the server-side Supabase session on sign-out before clearing cookies; password changes revoke other active sessions.
- Verify JWT issuer, audience, expiry, and authenticated role in addition to signature.
- Default proxy trust to off. Production operators must configure the exact trusted proxy hop count; a directly published API cannot trust arbitrary `X-Forwarded-For` headers.
- Normalize email-based rate-limit keys with trim and lowercase. Keep the installed in-memory limiter for the current single API instance; the deployment guide makes a shared limiter a blocking prerequisite before horizontal scaling.
- Make authentication cookies secure by default outside development/test and retain `HttpOnly` and `SameSite` protections.
- Remove authoritative `total_php` and `author_name` fields from request schemas and add the field limits defined above.
- Replace `/messages/latest` load-all-and-deduplicate behavior with one bounded database query that returns at most one latest message for each authorized thread.
- Error responses remain generic at authentication and authorization boundaries; detailed errors stay server-side.

## Runtime, Containers, and CI

- Move local declarations, CI, and container images from end-of-life Node 20 to Node 24 LTS.
- Add a root `.dockerignore` covering `.git`, all `.env*` files except committed examples, dependencies, build/test output, and logs.
- Make Docker installs deterministic with `npm ci`; remove the fallback install and do not copy the full development `node_modules` tree into the runtime image.
- Run the API container as a non-root user and expose only the required runtime files and production dependencies.
- Supply all required Supabase/API variables explicitly in Compose without committing secrets.
- Restrict the web CSP to the configured Supabase HTTP/WebSocket origins instead of a project-wide wildcard.
- Give GitHub Actions explicit least-privilege permissions, pin third-party actions to immutable commits, retain `npm audit`, and add blocking CodeQL plus Trivy filesystem/secret/misconfiguration and container-image scans. These jobs use no production credentials.
- Add a migration/RLS integration job that starts an isolated local Supabase stack and executes exploit regression cases. Production branch protection must require this job as documented in the release checklist.

## Test Design

Each non-trivial security change starts with a failing regression test. Coverage must include:

- anonymous/authenticated callers cannot execute privileged functions;
- users cannot anonymize or delete another user's messages;
- guests cannot self-confirm or decline bookings through direct Supabase access;
- booking totals are calculated from venue data and ignore forged client totals;
- review author names and eligibility cannot be forged;
- public venue/review projections omit private identifiers and deleted/non-live records;
- cancelling/deleting a booking or venue does not cascade-delete messages or reviews;
- storage uploads require authentication, owner prefixes, limits, and quotas;
- reset redirects ignore hostile headers and reset responses do not enumerate accounts;
- sign-out revokes the refresh session and cookie flags fail secure;
- forged JWT issuer/audience and spoofed forwarding headers are rejected;
- latest-message queries are bounded to one row per authorized thread;
- the documented fresh migration sequence and a representative existing-schema upgrade both reach v10 successfully;
- API build/tests, web build/tests, dependency audit, and container/config checks pass.

## Data and Request Flow

1. The browser sends authenticated API requests using the existing access-token/cookie flow.
2. The API validates shape and identity but does not trust price, role, authorship, redirect host, or workflow state supplied by the client.
3. User-scoped Supabase calls preserve the caller JWT so RLS and actor-aware triggers make the final authorization decision.
4. Database triggers derive canonical values and reject invalid transitions before writing.
5. Public reads return only explicit projections; private details require a party/owner relationship.
6. Deletion changes visibility/state while retaining dependent records.

## Error Handling and Rollout

- Constraint, RLS, and transition failures map to stable 4xx responses; unexpected database details are not returned to clients.
- The corrective migration performs preflight checks and fails as one transaction if an unsafe catalog state is detected.
- Deployment instructions require backup, staging application, migration/RLS tests, API rollout, and post-deploy probes before production application.
- Because this task is repository-only, the final handoff will include the exact migration and verification commands but will not execute them against a remote project.

## Acceptance Criteria

- Every audit finding is either prevented by code/database policy or converted into an explicit deployment invariant with an automated or documented gate.
- Direct Supabase access cannot bypass booking, pricing, review, deletion, function, storage, or identifier-privacy rules.
- No existing visual styling is intentionally changed.
- Fresh and upgrade migration paths are documented and tested.
- Repository tests and audits pass on Node 24.
- No secrets or local environment files enter source control or container layers.

## Deliberate Boundary

Distributed rate limiting is not introduced for the current single-instance service. Before more than one API replica is deployed, a shared limiter is mandatory and called out as a release blocker. Adding Redis or another service now would add an unused operational dependency without improving the deployed single-instance boundary.
