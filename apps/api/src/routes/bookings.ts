import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthedRequest } from '../types/express.js'
import type { BookingRow } from '../types/db.js'
import {
  CreateBookingSchema,
  UpdateBookingStatusSchema,
  parsePagination,
  validationErrorBody,
} from '../lib/validation.js'

const router = Router()

// All booking endpoints require authentication
router.use(requireAuth)

// The insert allowlist (venue_id, venue_name, event_type, event_date, hours,
// guests, total_php, note) is enforced by CreateBookingSchema in
// lib/validation.js — user_id is pinned to the caller and status is forced to
// 'requested' (no self-confirm).

// Load a booking and confirm the caller is party to it (the booking guest or
// the host who owns the venue). Returns 403-shaped null when not authorized.
async function loadBookingIfParty(
  r: AuthedRequest,
  id: string,
): Promise<{ row: Record<string, any> | null; allowed: boolean; found: boolean }> {
  const { data, error } = await r.supabase
    .from('bookings')
    .select('id,user_id,venue_id,status')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return { row: null, allowed: false, found: false }
  if (data.user_id === r.user.id) return { row: data, allowed: true, found: true }
  // Host side: caller owns the venue being booked.
  const { data: venue, error: vErr } = await r.supabase
    .from('venues')
    .select('owner_id')
    .eq('id', data.venue_id)
    .maybeSingle()
  if (vErr) throw vErr
  return { row: data, allowed: venue?.owner_id === r.user.id, found: true }
}

// GET /api/bookings — List bookings for the authenticated user (guest)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePagination(req)
    const user = (req as AuthedRequest).user
    const { data, error } = await (req as AuthedRequest).supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    res.json({ bookings: data || [] })
  } catch (e) {
    next(e)
  }
})

// GET /api/bookings/requests — List requests for specified venue IDs (host side)
router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venueIdsQuery = req.query.venue_ids as string
    if (!venueIdsQuery) {
      res.json({ bookings: [] })
      return
    }
    const venueIds = venueIdsQuery.split(',').filter(Boolean)
    if (!venueIds.length) {
      res.json({ bookings: [] })
      return
    }
    const { limit, offset } = parsePagination(req)
    const { data, error } = await (req as AuthedRequest).supabase
      .from('bookings')
      .select('*')
      .in('venue_id', venueIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    res.json({ bookings: data || [] })
  } catch (e) {
    next(e)
  }
})

// GET /api/bookings/:id — Get details of a single booking (caller must be party to it)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = req as AuthedRequest
    const { allowed, found } = await loadBookingIfParty(r, req.params.id as string)
    if (!found) { res.status(404).json({ error: 'Booking not found.' }); return }
    if (!allowed) { res.status(403).json({ error: 'Not your booking.' }); return }
    const { data, error } = await r.supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id as string)
      .single()
    if (error) throw error
    res.json(data)
  } catch (e) {
    next(e)
  }
})

// POST /api/bookings — Create a new booking request. user_id is pinned to the
// caller and status is forced to 'requested'.
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthedRequest).user
    const parsed = CreateBookingSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const row = parsed.data
    const { data, error } = await (req as AuthedRequest).supabase
      .from('bookings')
      .insert({ ...row, user_id: user.id, status: 'requested' } as Partial<BookingRow>)
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    next(e)
  }
})

// PATCH /api/bookings/:id — Update booking status (host confirm/decline, guest cancel).
// Caller must be the booking guest or the venue host.
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = req as AuthedRequest
    const parsed = UpdateBookingStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const { status } = parsed.data
    const { row, allowed, found } = await loadBookingIfParty(r, req.params.id as string)
    if (!found) { res.status(404).json({ error: 'Booking not found.' }); return }
    if (!allowed) { res.status(403).json({ error: 'Not your booking.' }); return }
    // A guest may only cancel, not confirm/decline someone else's flow.
    const isGuest = row!.user_id === r.user.id
    const guestBlocked = isGuest && status !== 'cancelled'
    if (guestBlocked) {
      res.status(403).json({ error: 'Guests can only cancel their own requests.' })
      return
    }
    const { data, error } = await r.supabase
      .from('bookings')
      .update({ status })
      .eq('id', req.params.id as string)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (e) {
    next(e)
  }
})

// DELETE /api/bookings/:id — Cancel/delete a booking request. Only the booking
// guest may delete, and only while the request is not yet confirmed.
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = req as AuthedRequest
    const { row, allowed, found } = await loadBookingIfParty(r, req.params.id as string)
    if (!found) { res.status(404).json({ error: 'Booking not found.' }); return }
    if (!allowed) { res.status(403).json({ error: 'Not your booking.' }); return }
    if (row!.user_id !== r.user.id) {
      res.status(403).json({ error: 'Only the guest can cancel a request.' })
      return
    }
    if (row!.status === 'confirmed') {
      res.status(409).json({ error: 'Confirmed bookings cannot be deleted.' })
      return
    }
    const { error } = await r.supabase
      .from('bookings')
      .delete()
      .eq('id', req.params.id as string)
    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

export default router
