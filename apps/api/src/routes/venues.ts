import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthedRequest } from '../types/express.js'
import type { VenueRow } from '../types/db.js'
import { CreateVenueSchema, parsePagination, validationErrorBody } from '../lib/validation.js'

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

// GET /api/venues/my — venues owned by the calling user, paginated.
router.get('/my', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthedRequest).user
    const { limit, offset } = parsePagination(req)
    // Two round-trips are unavoidable for accurate pagination: count + page.
    // The count is small and index-backed (venues_owner_idx).
    const { count, error: countErr } = await (req as AuthedRequest).supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
    if (countErr) throw countErr
    const { data, error } = await (req as AuthedRequest).supabase
      .from('venues')
      .select(VENUE_COLUMNS)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    res.json({ venues: data || [], total: count ?? 0 })
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

// POST /api/venues — create a venue. Self-service hosting is intentional: any
// authenticated user can list a venue. On first listing we promote the caller's
// profile role to 'host' so the rest of the app can treat them as a Host.
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = req as AuthedRequest
    const user = r.user
    const parsed = CreateVenueSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const row = { ...parsed.data }
    if (!row.status) row.status = 'live'
    const { data, error } = await r.supabase
      .from('venues')
      .insert({ ...row, owner_id: user.id } as Partial<VenueRow>)
      .select()
      .single()
    if (error) throw error
    // Best-effort role promotion; ignore failures if the v8 profiles table is
    // not yet applied in this environment.
    try { await r.supabase.from('profiles').update({ role: 'host' }).eq('id', user.id) } catch { /* ignored */ }
    res.status(201).json(data)
  } catch (e) {
    next(e)
  }
})

// PUT /api/venues/:id — update a venue the caller owns. RLS enforces the
// ownership check (only rows owned by the caller are visible to the update), so
// this collapses to a single round-trip. A missing or unowned id returns 404.
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = req as AuthedRequest
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
    if (!data) { res.status(404).json({ error: 'Venue not found.' }); return }
    res.json(data)
  } catch (e) {
    next(e)
  }
})

// DELETE /api/venues/:id — delete a venue the caller owns. RLS enforces the
// ownership check; 0 affected rows means the venue was not found or not owned.
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const r = req as AuthedRequest
    const { error, count } = await r.supabase
      .from('venues')
      .delete({ count: 'exact' })
      .eq('id', req.params.id as string)
    if (error) throw error
    if (!count) { res.status(404).json({ error: 'Venue not found.' }); return }
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

export default router