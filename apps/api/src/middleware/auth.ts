import type { Request, Response, NextFunction } from 'express'
import { isConfigured, createUserClient, createAnonClient } from '../lib/supabase.js'
import type { AuthedRequest } from '../types/express.js'

// Resolves the user if a valid Bearer token is provided. Otherwise, attaches
// a public/anonymous client. This is used for public endpoints that optionally
// display user-specific data (e.g. public listings vs private drafts under RLS).
export async function resolveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isConfigured) {
    res.status(503).json({ error: 'API not configured.' })
    return
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const r = req as AuthedRequest

  if (token) {
    try {
      const anonClient = createAnonClient()
      const { data, error } = await anonClient.auth.getUser(token)
      if (!error && data?.user) {
        r.user = data.user
        r.supabase = createUserClient(token)
        next()
        return
      }
    } catch (e) {
      // Ignore token errors and fallback to anon
    }
  }

  r.user = null as any
  r.supabase = createAnonClient()
  next()
}

// Enforces that the request is authenticated. Reuses user/client if resolveUser
// has already run, otherwise parses and validates the Bearer token.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const r = req as AuthedRequest
  if (r.user && r.supabase) {
    next()
    return
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' })
    return
  }
  if (!isConfigured) {
    res.status(503).json({ error: 'API not configured.' })
    return
  }

  try {
    const anonClient = createAnonClient()
    const { data, error } = await anonClient.auth.getUser(token)
    if (error || !data?.user) {
      res.status(401).json({ error: 'Invalid or expired token.' })
      return
    }
    r.user = data.user
    r.supabase = createUserClient(token)
    next()
  } catch (e) {
    next(e)
  }
}