import type { Request, Response, NextFunction } from 'express'
import { jwtVerify } from 'jose'
import type { User } from '@supabase/supabase-js'
import { isConfigured, createUserClient, createAnonClient, supabaseAdmin } from '../lib/supabase.js'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, readCookie, setCookie, authCookieOptions, refreshCookieOptions } from '../lib/cookies.js'
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

// Try to resolve a valid access token + user from cookies. If the access token
// is expired or absent but a refresh token cookie exists, refresh server-side
// and set new cookies. Returns the resolved token and user, or null.
async function resolveFromCookies(
  req: Request,
  res: Response,
): Promise<{ token: string; user: User } | null> {
  if (!supabaseAdmin) return null
  const access = readCookie(req, ACCESS_TOKEN_COOKIE)
  if (access) {
    const localUser = await userFromToken(access)
    if (localUser) return { token: access, user: localUser }
    const { data, error } = await supabaseAdmin.auth.getUser(access)
    if (!error && data.user) return { token: access, user: data.user }
  }
  const refresh = readCookie(req, REFRESH_TOKEN_COOKIE)
  if (!refresh) return null
  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refresh })
  if (error || !data.session || !data.user) return null
  // Rotate cookies on successful refresh.
  setCookie(res, ACCESS_TOKEN_COOKIE, data.session.access_token, authCookieOptions())
  setCookie(res, REFRESH_TOKEN_COOKIE, data.session.refresh_token, refreshCookieOptions())
  return { token: data.session.access_token, user: data.user }
}

// Resolves the user from a Bearer header or from httpOnly auth cookies. Otherwise,
// attaches a public/anonymous client. Used for public endpoints that optionally
// display user-specific data under RLS.
export async function resolveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isConfigured) {
    res.status(503).json({ error: 'API not configured.' })
    return
  }

  const r = req as AuthedRequest
  const header = req.headers.authorization || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null

  if (bearer) {
    try {
      const localUser = await userFromToken(bearer)
      if (localUser) {
        r.user = localUser
        r.supabase = createUserClient(bearer)
        next()
        return
      }
      const anonClient = createAnonClient()
      const { data, error } = await anonClient.auth.getUser(bearer)
      if (!error && data?.user) {
        r.user = data.user
        r.supabase = createUserClient(bearer)
        next()
        return
      }
    } catch (e) {
      // Ignore token errors and try cookies next.
    }
  }

  try {
    const fromCookies = await resolveFromCookies(req, res)
    if (fromCookies) {
      r.user = fromCookies.user
      r.supabase = createUserClient(fromCookies.token)
      next()
      return
    }
  } catch (e) {
    // Ignore cookie errors and fallback to anon.
  }

  r.user = null as any
  r.supabase = createAnonClient()
  next()
}

// Enforces that the request is authenticated. Reuses user/client if resolveUser
// has already run, otherwise checks the Bearer header or httpOnly auth cookies.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const r = req as AuthedRequest
  if (r.user && r.supabase) {
    next()
    return
  }

  if (!isConfigured) {
    res.status(503).json({ error: 'API not configured.' })
    return
  }

  const header = req.headers.authorization || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null

  if (bearer) {
    try {
      const localUser = await userFromToken(bearer)
      if (localUser) {
        r.user = localUser
        r.supabase = createUserClient(bearer)
        next()
        return
      }
      const anonClient = createAnonClient()
      const { data, error } = await anonClient.auth.getUser(bearer)
      if (!error && data?.user) {
        r.user = data.user
        r.supabase = createUserClient(bearer)
        next()
        return
      }
    } catch (e) {
      // Ignore token errors and try cookies next.
    }
  }

  try {
    const fromCookies = await resolveFromCookies(req, res)
    if (fromCookies) {
      r.user = fromCookies.user
      r.supabase = createUserClient(fromCookies.token)
      next()
      return
    }
  } catch (e) {
    // Ignore cookie errors.
  }

  res.status(401).json({ error: 'Authentication required.' })
}