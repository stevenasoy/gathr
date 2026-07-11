import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthedRequest } from '../types/express.js'
import type { MessageRow } from '../types/db.js'
import { CreateMessageSchema, LatestMessagesSchema, validationErrorBody } from '../lib/validation.js'

const router = Router()

// All message routes require authentication
router.use(requireAuth)

// GET /api/messages — List messages in a thread
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const col = req.query.col as string
    const id = req.query.id as string
    if (!col || !id) {
      res.status(400).json({ error: 'col (booking_id or conversation_id) and id are required.' })
      return
    }
    if (col !== 'booking_id' && col !== 'conversation_id') {
      res.status(400).json({ error: 'col must be booking_id or conversation_id.' })
      return
    }
    const limit = req.query.limit ? Number(req.query.limit) : 500
    const offset = req.query.offset ? Number(req.query.offset) : 0
    const { data, error } = await (req as AuthedRequest).supabase
      .from('messages')
      .select('*')
      .eq(col, id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
    if (error) throw error
    res.json({ messages: data || [] })
  } catch (e) {
    next(e)
  }
})

// POST /api/messages — Send a message. sender_id is pinned to the caller; the
// client cannot spoof the sender.
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthedRequest).user
    const parsed = CreateMessageSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const { col, id, body } = parsed.data
    const row: Record<string, unknown> = { sender_id: user.id, body }
    row[col] = id
    const { data, error } = await (req as AuthedRequest).supabase
      .from('messages')
      .insert(row as Partial<MessageRow>)
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    next(e)
  }
})

// POST /api/messages/latest — Fetch latest messages for a list of thread IDs
router.post('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LatestMessagesSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(422).json(validationErrorBody(parsed.error))
      return
    }
    const { col, ids } = parsed.data
    if (!ids.length) {
      res.json({ latest: {} })
      return
    }

    // Run parallel queries fetching only the top 1 message (limiting to required fields) for each thread ID.
    // This is O(1) database search per thread, avoiding unbounded scans of all messages.
    const promises = ids.map(async (id) => {
      const { data, error } = await (req as AuthedRequest).supabase
        .from('messages')
        .select('id,body,created_at,sender_id,booking_id,conversation_id')
        .eq(col, id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return { id, message: data }
    })

    const results = await Promise.all(promises)
    const latestMap: Record<string, any> = {}
    for (const r of results) {
      if (r.message) {
        latestMap[r.id] = r.message
      }
    }
    res.json({ latest: latestMap })
  } catch (e) {
    next(e)
  }
})

export default router
