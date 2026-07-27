import { z } from 'zod'
import type { Request } from 'express'

export const statusEnum = z.enum(['requested','confirmed','declined','cancelled','completed'])
export const ratingSchema = z.number().int().min(1).max(5)
export const phpSchema = z.number().min(0)
const uuid = z.string().uuid()
const shortName = z.string().trim().min(1).max(120)
const venueName = z.string().trim().min(1).max(160)
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional()
const url = z.string().url().max(2048).refine((value) => /^https?:\/\//i.test(value), 'URL must use http or https.')

export function parsePagination(req: Request): { limit: number; offset: number } {
  const limitRaw = req.query.limit
  const offsetRaw = req.query.offset
  let limit = 50
  let offset = 0
  if (limitRaw !== undefined && limitRaw !== null && limitRaw !== '') {
    const n = Math.trunc(Number(limitRaw)); if (Number.isFinite(n)) limit = Math.min(100, Math.max(1, n))
  }
  if (offsetRaw !== undefined && offsetRaw !== null && offsetRaw !== '') {
    const n = Math.trunc(Number(offsetRaw)); if (Number.isFinite(n)) offset = Math.max(0, n)
  }
  return { limit, offset }
}

export const CreateBookingSchema = z.object({
  venue_id: uuid,
  event_type: nullableText(120),
  event_date: z.string().date(),
  hours: z.number().int().min(1).max(168),
  guests: z.number().int().positive().nullable().optional(),
  note: nullableText(2000),
})
export const UpdateBookingStatusSchema = z.object({ status: statusEnum })
export const CreateReviewSchema = z.object({ booking_id: uuid, rating: ratingSchema, body: nullableText(4000) })
export const CreateMessageSchema = z.object({ col: z.enum(['booking_id', 'conversation_id']), id: uuid, body: z.string().trim().min(1).max(5000) })
export const LatestMessagesSchema = z.object({ col: z.enum(['booking_id', 'conversation_id']), ids: z.array(uuid).max(200) })
export const CreateConversationSchema = z.object({ venue_id: uuid, venue_name: venueName })
export const CreateVenueSchema = z.object({
  name: venueName.optional(), city: z.string().trim().min(1).max(120).optional(), area: z.string().trim().max(160).nullable().optional(),
  types: z.array(z.string().trim().min(1).max(60)).max(12).optional(), capacity: z.number().int().min(1).max(100000).optional(),
  price_per_hour: phpSchema.max(100000000).optional(), blurb: z.string().trim().max(5000).nullable().optional(),
  amenities: z.array(z.string().trim().min(1).max(100)).max(50).optional(), image_urls: z.array(url).max(20).optional(),
  host_name: shortName.nullable().optional(), host_type: z.enum(['individual', 'business']).optional(), price_unit: z.enum(['hour', 'head', 'event']).optional(),
  included_hours: z.number().int().min(1).max(168).nullable().optional(), status: z.enum(['live', 'unlisted', 'draft']).optional(),
})
export const SignUpSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(8).max(1024), name: shortName })
export const SignInSchema = SignUpSchema.pick({ email: true, password: true })
export const ResetPasswordSchema = SignInSchema.pick({ email: true })
export const UpdatePasswordSchema = SignInSchema.pick({ password: true })

export function validationErrorBody(error: z.ZodError): { error: { code: 'VALIDATION_ERROR'; message: string; details: unknown } } {
  return { error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: error.flatten() } }
}