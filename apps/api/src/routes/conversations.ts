import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthedRequest } from '../types/express.js'
import { CreateConversationSchema, parsePagination, validationErrorBody } from '../lib/validation.js'

const router = Router()

// All conversation routes require authentication
router.use(requireAuth)

// GET /api/conversations/guest — List conversations for the authenticated guest
router.get('/guest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = parsePagination(req)
    const user = (req as AuthedRequest).user
    const { data, error } = await (req as AuthedRequest).supabase
      .from('conversations')
      .select('*')
      .eq('guest_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    res.json({ conversations: data || [] })
  } catch (e) {
    next(e)
  }
})

// GET /api/conversations/venues — List conversations for a host's list of venues
router.get('/venues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venueIdsQuery = req.query.venue_ids as string
    if (!venueIdsQuery) {
      res.json({ conversations: [] })
      return
    }
    const venueIds = venueIdsQuery.split(',').filter(Boolean)
    if (!venueIds.length) {
      res.json({ conversations: [] })
      return
    }
    const { limit, offset } = parsePagination(req)
    const { data, error } = await (req as AuthedRequest).supabase
      .from('conversations')
      .select('*')
      .in('venue_id', venueIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    res.json({ conversations: data || [] })
  } catch (e) {
    next(e)
  }
})

// POST /api/conversations — Idempotent get-or-create conversation. guest_id is
// pinned to the caller; the client cannot open a thread attributed to someone else.
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthedRequest).user
    const parsed = CreateConversationSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const { venue_id, venue_name } = parsed.data
    const { data, error } = await (req as AuthedRequest).supabase
      .from('conversations')
      .upsert({ venue_id, venue_name, guest_id: user.id }, { onConflict: 'venue_id,guest_id' })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (e) {
    next(e)
  }
})

export default router
