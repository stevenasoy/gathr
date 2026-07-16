import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthedRequest } from '../types/express.js'
import { CreateReviewSchema, parsePagination, validationErrorBody } from '../lib/validation.js'

const router = Router()

// GET /api/reviews/venue/:id — Public listing of reviews for a venue. Uses the
// reviews_public view so anon callers never see reviewer user_id (M21).
router.get('/venue/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePagination(req)
    const { data, error } = await (req as AuthedRequest).supabase
      .from('reviews_public' as any)
      .select('*')
      .eq('venue_id', req.params.id as string)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    res.json({ reviews: data || [] })
  } catch (e) {
    next(e)
  }
})

// GET /api/reviews/stats — Public aggregate stats for the venue catalog
//
// In-memory cache: the materialized view query is already cheap, but stats are
// requested on every venue-catalog load, so we avoid even that read on hot paths.
// Stats are approximate aggregates and 30s staleness is acceptable; the cache is
// purely TTL-based (no explicit invalidation), so there is no stale-lock bug —
// every entry expires within STATS_TTL_MS regardless of trigger-driven refreshes.
const STATS_TTL_MS = 30_000
let statsCache: { data: Record<string, { count: number; avg: number }>; expiry: number } | null = null

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 0. Return cached stats if fresh.
    if (statsCache && statsCache.expiry > Date.now()) {
      res.json({ stats: statsCache.data })
      return
    }

    // 1. Try querying the materialized view first for optimal O(N_venues) database-side read.
    const { data: viewData, error: viewError } = await (req as AuthedRequest).supabase
      .from('venue_review_stats')
      .select('venue_id, count, avg')

    if (!viewError && viewData) {
      const stats: Record<string, { count: number; avg: number }> = {}
      for (const r of viewData) {
        stats[r.venue_id] = { count: Number(r.count), avg: Number(r.avg) }
      }
      statsCache = { data: stats, expiry: Date.now() + STATS_TTL_MS }
      res.json({ stats })
      return
    }

    if (viewError) throw viewError
  } catch (e) {
    next(e)
  }
})

// GET /api/reviews/booking/:id — Get a review for a specific booking (requires Auth)
router.get('/booking/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await (req as AuthedRequest).supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', req.params.id as string)
      .maybeSingle()
    if (error) throw error
    res.json(data || null)
  } catch (e) {
    next(e)
  }
})

// POST /api/reviews — Create a review for a completed booking. user_id is
// pinned to the caller; a reviewer cannot attribute a review to another user.
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateReviewSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const { booking_id, rating, body } = parsed.data
    const { data, error } = await (req as AuthedRequest).supabase
      .from('reviews')
      .insert({ booking_id, rating, body: body || null })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    next(e)
  }
})

export default router
