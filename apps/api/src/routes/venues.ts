import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthedRequest } from '../types/express.js'
import type { VenueRow } from '../types/db.js'
import { CreateVenueSchema, validationErrorBody } from '../lib/validation.js'

// All routes here sit behind `requireAuth`, so `req.supabase` is a client scoped
// to the caller's JWT and RLS applies (same rules as the web client).
const router = Router()

const VENUE_COLUMNS =
  'id,owner_id,name,city,area,types,capacity,price_per_hour,blurb,amenities,image_urls,host_name,host_type,price_unit,included_hours,status,created_at'

// The insert/update allowlist (name, city, area, types, capacity,
// price_per_hour, blurb, amenities, image_urls, host_name, host_type,
// price_unit, included_hours, status) is enforced by CreateVenueSchema in
// lib/validation.js. Identity (owner_id) and audit columns are excluded — the
// server pins owner_id to the caller; id/created_at/updated_at are DB-managed.

// GET /api/venues — live venues visible to the caller (RLS-filtered).
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100
    const offset = req.query.offset ? Number(req.query.offset) : 0
    const { data, error } = await (req as AuthedRequest).supabase
      .from('venues')
      .select(VENUE_COLUMNS)
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    res.json({ venues: data || [] })
  } catch (e) {
    next(e)
  }
})

// GET /api/venues/my — all venues owned by the calling user.
router.get('/my', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthedRequest).user
    const { data, error } = await (req as AuthedRequest).supabase
      .from('venues')
      .select(VENUE_COLUMNS)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ venues: data || [] })
  } catch (e) {
    next(e)
  }
})

// GET /api/venues/:id — detail of a venue.
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await (req as AuthedRequest).supabase
      .from('venues')
      .select(VENUE_COLUMNS)
      .eq('id', req.params.id as string)
      .single()
    if (error) throw error
    res.json(data)
  } catch (e) {
    next(e)
  }
})

// POST /api/venues — create a venue. owner_id is pinned to the caller; the
// client cannot attribute a listing to another host.
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthedRequest).user
    const parsed = CreateVenueSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const row = { ...parsed.data }
    if (!row.status) row.status = 'live'
    const { data, error } = await (req as AuthedRequest).supabase
      .from('venues')
      .insert({ ...row, owner_id: user.id } as Partial<VenueRow>)
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    next(e)
  }
})

// PUT /api/venues/:id — update a venue the caller owns. Mutating fields are
// whitelisted; identity/audit columns cannot be overwritten.
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = req as AuthedRequest
    const { data: existing, error: findErr } = await r.supabase
      .from('venues')
      .select('owner_id')
      .eq('id', req.params.id as string)
      .maybeSingle()
    if (findErr) throw findErr
    if (!existing) { res.status(404).json({ error: 'Venue not found.' }); return }
    if (existing.owner_id !== r.user.id) { res.status(403).json({ error: 'Not your venue.' }); return }

    const parsed = CreateVenueSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const fields = parsed.data
    const { data, error } = await r.supabase
      .from('venues')
      .update(fields as Partial<VenueRow>)
      .eq('id', req.params.id as string)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (e) {
    next(e)
  }
})

// DELETE /api/venues/:id — delete a venue the caller owns.
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = req as AuthedRequest
    const { data: existing, error: findErr } = await r.supabase
      .from('venues')
      .select('owner_id')
      .eq('id', req.params.id as string)
      .maybeSingle()
    if (findErr) throw findErr
    if (!existing) { res.status(404).json({ error: 'Venue not found.' }); return }
    if (existing.owner_id !== r.user.id) { res.status(403).json({ error: 'Not your venue.' }); return }

    const { error } = await r.supabase
      .from('venues')
      .delete()
      .eq('id', req.params.id as string)
    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

export default router