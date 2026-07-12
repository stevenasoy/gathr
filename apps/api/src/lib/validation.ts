// Central input-validation layer for the API boundary.
//
// Every write handler parses req.body through a zod schema before touching the
// database, so malformed payloads are rejected with a 422 at the edge instead
// of leaking into Supabase calls as ad-hoc `if (!field)` checks. The schemas
// mirror the per-route `pick()` allowlists — zod's default `.strip()` drops any
// key not defined here, preserving the allowlist behavior. Fields are optional
// where the route previously accepted a partial body (the DB NOT NULL / CHECK
// constraints remain the source of truth for completeness); types are enforced
// so bad input is rejected up front.
//
// Allowed booking statuses come from the v5 schema CHECK constraint
// `bookings_status_chk` (status in requested/confirmed/declined/cancelled/
// completed) and the `guard_booking_status` transition trigger — see
// supabase/v5-schema.sql. `completed` is included so the confirmed→completed
// host transition still parses.

import { z } from 'zod'
import type { Request } from 'express'

// --- Reusable primitives ---

// Booking statuses permitted by the bookings_status_chk DB constraint.
export const statusEnum = z.enum([
  'requested',
  'confirmed',
  'declined',
  'cancelled',
  'completed',
])

// Review rating: integer 1..5 (matches reviews.rating CHECK).
export const ratingSchema = z.number().int().min(1).max(5)

// Non-negative PHP amount (matches venues price_per_hour >= 0 CHECK).
export const phpSchema = z.number().min(0)

// --- Pagination helper ---

// Clamp limit to [1,100] (default 50) and offset to a non-negative integer
// (default 0). Non-numeric / empty values fall back to the defaults rather than
// producing NaN, which the previous `Number(req.query.limit)` calls could.
export function parsePagination(
  req: Request,
): { limit: number; offset: number } {
  const limitRaw = req.query.limit
  const offsetRaw = req.query.offset

  let limit = 50
  let offset = 0

  if (limitRaw !== undefined && limitRaw !== null && limitRaw !== '') {
    const n = Math.trunc(Number(limitRaw))
    if (Number.isFinite(n)) limit = Math.min(100, Math.max(1, n))
  }
  if (offsetRaw !== undefined && offsetRaw !== null && offsetRaw !== '') {
    const n = Math.trunc(Number(offsetRaw))
    if (Number.isFinite(n)) offset = Math.max(0, n)
  }

  return { limit, offset }
}

// --- Per-endpoint body schemas ---

// POST /api/bookings — mirrors BOOKING_INSERT_KEYS. user_id and status are
// pinned by the route, not accepted from the client.
export const CreateBookingSchema = z.object({
  venue_id: z.string().min(1).optional(),
  venue_name: z.string().min(1).optional(),
  event_type: z.string().nullable().optional(),
  event_date: z.string().nullable().optional(),
  hours: z.number().int().optional(),
  guests: z.number().int().nullable().optional(),
  total_php: phpSchema.optional(),
  note: z.string().nullable().optional(),
})

// PATCH /api/bookings/:id — status only. The guest-cancel rule is enforced
// after parsing, as before.
export const UpdateBookingStatusSchema = z.object({
  status: statusEnum,
})

// POST /api/reviews — mirrors the required-field set + optional body.
export const CreateReviewSchema = z.object({
  booking_id: z.string().min(1),
  venue_id: z.string().min(1),
  author_name: z.string().min(1),
  rating: ratingSchema,
  body: z.string().nullable().optional(),
})

// POST /api/messages — col selects which thread column to set.
export const CreateMessageSchema = z.object({
  col: z.enum(['booking_id', 'conversation_id']),
  id: z.string().min(1),
  body: z.string().min(1),
})

// POST /api/messages/latest — ids may be empty (route returns { latest: {} }).
export const LatestMessagesSchema = z.object({
  col: z.enum(['booking_id', 'conversation_id']),
  ids: z.array(z.string()),
})

// POST /api/conversations — idempotent get-or-create.
export const CreateConversationSchema = z.object({
  venue_id: z.string().min(1),
  venue_name: z.string().min(1),
})

// POST /api/venues + PUT /api/venues/:id — mirrors VUE_INSERT_KEYS /
// VENUE_UPDATE_KEYS (identical allowlists). host_type / price_unit / status
// enums match the v5 CHECK constraints; owner_id is pinned by the route.
export const CreateVenueSchema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  area: z.string().nullable().optional(),
  types: z.array(z.string()).optional(),
  capacity: z.number().int().positive().optional(),
  price_per_hour: phpSchema.optional(),
  blurb: z.string().nullable().optional(),
  amenities: z.array(z.string()).optional(),
  image_urls: z.array(z.string()).optional(),
  host_name: z.string().nullable().optional(),
  host_type: z.enum(['individual', 'business']).optional(),
  price_unit: z.enum(['hour', 'head', 'event']).optional(),
  included_hours: z.number().int().nullable().optional(),
  status: z.enum(['live', 'unlisted', 'draft']).optional(),
})

// Uniform 422 response body for a failed safeParse.
export function validationErrorBody(
  error: z.ZodError,
): { error: { code: 'VALIDATION_ERROR'; message: string; details: unknown } } {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input.',
      details: error.flatten(),
    },
  }
}