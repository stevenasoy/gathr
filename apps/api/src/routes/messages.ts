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
//
// Pagination: default limit 50, clamped to a max of 200. Messages are capped at
// 200 (vs the parsePagination default of 100) because a thread is a single
// linear conversation — a host/gatherer legitimately scrolling back through one
// booking's chat history can need a larger page than a generic list endpoint,
// but an unbounded read (the old default of 500, no upper clamp) risks pulling
// an entire long thread into memory at once. 200 bounds that while staying well
// above the default page size. Only the columns actually consumed by the client
// are selected instead of `*`.
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
    // Default 50, clamp client limit to a max of 200 so a client cannot request
    // an unbounded read; offset is a non-negative int. Number(req.query.limit)||50
    // maps ""/0/non-numeric to the default 50.
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Math.max(0, Math.trunc(Number(req.query.offset)) || 0)
    const { data, error } = await (req as AuthedRequest).supabase
      .from('messages')
      .select('id,body,created_at,sender_id,booking_id,conversation_id')
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

    // Cap the batch at 200 thread IDs. The previous implementation fired one
    // Supabase query per id (Promise.all of N queries), so a large ids array
    // could exhaust the connection pool / PostgREST's concurrency; a single
    // round-trip with an .in() filter is bounded by one query regardless of N,
    // but we still cap to avoid an unbounded IN-list and a huge response.
    if (ids.length > 200) {
      // Match the validationErrorBody shape (error.flatten() produces
      // { formErrors, fieldErrors }) so the client's existing 422 handling
      // treats this identically to a schema parse failure.
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input.',
          details: {
            formErrors: [],
            fieldErrors: { ids: ['ids must contain at most 200 entries.'] },
          },
        },
      })
      return
    }

    const { data, error } = await ((req as AuthedRequest).supabase as any).rpc('latest_messages', { p_thread_kind: col, p_thread_ids: ids })
    if (error) throw error
    const latestMap: Record<string, any> = {}
    for (const row of (data || []) as any[]) latestMap[row.thread_id] = row
    res.json({ latest: latestMap })
  } catch (e) {
    next(e)
  }
})

export default router
