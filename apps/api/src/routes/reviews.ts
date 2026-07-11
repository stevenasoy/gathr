import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthedRequest } from '../types/express.js'
import { CreateReviewSchema, parsePagination, validationErrorBody } from '../lib/validation.js'

const router = Router()

// GET /api/reviews/venue/:id — Public listing of reviews for a venue
router.get('/venue/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePagination(req)
    const { data, error } = await (req as AuthedRequest).supabase
      .from('reviews')
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
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Try querying the database view first for optimal O(N_venues) database-side calculation.
    const { data: viewData, error: viewError } = await (req as AuthedRequest).supabase
      .from('venue_review_stats')
      .select('venue_id, count, avg')

    if (!viewError && viewData) {
      const stats: Record<string, { count: number; avg: number }> = {}
      for (const r of viewData) {
        stats[r.venue_id] = { count: Number(r.count), avg: Number(r.avg) }
      }
      res.json({ stats })
      return
    }

    // 2. Fallback to in-memory processing if the view hasn't been created yet.
    const { data, error } = await (req as AuthedRequest).supabase
      .from('reviews')
      .select('venue_id, rating')
    if (error) throw error

    const stats: Record<string, { count: number; sum: number; avg: number }> = {}
    for (const r of data || []) {
      const s = (stats[r.venue_id] ||= { count: 0, sum: 0, avg: 0 })
      s.count += 1
      s.sum += r.rating
    }
    const finalStats: Record<string, { count: number; avg: number }> = {}
    for (const id in stats) {
      finalStats[id] = {
        count: stats[id].count,
        avg: Math.round((stats[id].sum / stats[id].count) * 100) / 100
      }
    }
    res.json({ stats: finalStats })
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
    const user = (req as AuthedRequest).user
    const parsed = CreateReviewSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const { booking_id, venue_id, author_name, rating, body } = parsed.data
    const { data, error } = await (req as AuthedRequest).supabase
      .from('reviews')
      .insert({ booking_id, venue_id, user_id: user.id, author_name, rating, body: body || null })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    next(e)
  }
})

export default router
