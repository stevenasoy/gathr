import type { Request, Response, NextFunction } from 'express'
import { jwtVerify } from 'jose'
import type { User } from '@supabase/supabase-js'
import { isConfigured, createUserClient, createAnonClient } from '../lib/supabase.js'
import type { AuthedRequest } from '../types/express.js'

// Local JWT verification removes the per-request auth-service hop. Supabase Auth
// issues HS256 tokens signed with the project JWT secret; we verify them here
// and build a lightweight User object. If the secret is not configured we fall
// back to the network call to auth.getUser() (existing behavior).
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET

async function userFromToken(token: string): Promise<User | null> {
  if (!JWT_SECRET || !token) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET), {
      algorithms: ['HS256'],
    })
    if (!payload.sub) return null
    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      user_metadata: (payload.user_metadata as Record<string, unknown>) || {},
      app_metadata: (payload.app_metadata as Record<string, unknown>) || {},
      aud: payload.aud as string,
      role: payload.role as string,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User
  } catch (e) {
    return null
  }
}

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
      // 1. Try local verification first to avoid the auth-service network hop.
      const localUser = await userFromToken(token)
      if (localUser) {
        r.user = localUser
        r.supabase = createUserClient(token)
        next()
        return
      }
      // 2. Fall back to auth.getUser when the JWT secret is not configured or
      //    the token didn't verify locally (e.g. old signing secret rotated).
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
    // Prefer local JWT verification; fall back to the auth service if unavailable.
    const localUser = await userFromToken(token)
    if (localUser) {
      r.user = localUser
      r.supabase = createUserClient(token)
      next()
      return
    }
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