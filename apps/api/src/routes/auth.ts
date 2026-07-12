import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { isConfigured, supabaseAdmin, createUserClient } from '../lib/supabase.js'
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  setCookie,
  clearCookie,
  authCookieOptions,
  refreshCookieOptions,
  readCookie,
} from '../lib/cookies.js'

const router = Router()

interface AuthBody {
  email?: string
  password?: string
  name?: string
}

function badRequest(res: Response, message: string): void {
  res.status(400).json({ error: message })
}

function setSessionCookies(res: Response, session: { access_token: string; refresh_token?: string }): void {
  setCookie(res, ACCESS_TOKEN_COOKIE, session.access_token, authCookieOptions())
  if (session.refresh_token) {
    setCookie(res, REFRESH_TOKEN_COOKIE, session.refresh_token, refreshCookieOptions())
  }
}

function clearSessionCookies(res: Response): void {
  clearCookie(res, ACCESS_TOKEN_COOKIE, '/')
  clearCookie(res, REFRESH_TOKEN_COOKIE, '/api/auth')
}

// POST /api/auth/signup — strict rate limiting is applied in index.ts.
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isConfigured || !supabaseAdmin) {
      res.status(503).json({ error: 'API not configured.' })
      return
    }
    const { email, password, name } = req.body as AuthBody
    if (!email || !password) {
      badRequest(res, 'Email and password are required.')
      return
    }
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) {
      res.status(422).json({ error: error.message })
      return
    }
    if (data.session) setSessionCookies(res, data.session)
    res.json({ user: data.user, session: data.session ? { access_token: data.session.access_token } : null })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/signin
router.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isConfigured || !supabaseAdmin) {
      res.status(503).json({ error: 'API not configured.' })
      return
    }
    const { email, password } = req.body as AuthBody
    if (!email || !password) {
      badRequest(res, 'Email and password are required.')
      return
    }
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      res.status(401).json({ error: error?.message || 'Invalid credentials.' })
      return
    }
    setSessionCookies(res, data.session)
    res.json({ user: data.user, access_token: data.session.access_token })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/signout — clear cookies server-side. We do not have a
// refresh-token revocation endpoint exposed by gotrue-js, so clearing the httpOnly
// cookies is the practical sign-out for this SPA model.
router.post('/signout', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    clearSessionCookies(res)
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

// GET /api/auth/session — return current user and a short-lived access token.
// The access token is exposed to JS intentionally so the SPA can make direct
// Supabase calls for realtime / saved-venues; the long-lived refresh token
// remains httpOnly. This is the standard split-token SPA model.
router.get('/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isConfigured || !supabaseAdmin) {
      res.status(503).json({ error: 'API not configured.' })
      return
    }
    const access = readCookie(req, ACCESS_TOKEN_COOKIE)
    if (access) {
      const { data, error } = await supabaseAdmin.auth.getUser(access)
      if (!error && data.user) {
        res.json({ user: data.user, access_token: access })
        return
      }
    }
    // Access token missing/expired — try refreshing via the httpOnly cookie.
    const refresh = readCookie(req, REFRESH_TOKEN_COOKIE)
    if (!refresh) {
      res.status(401).json({ error: 'Not authenticated.' })
      return
    }
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refresh })
    if (error || !data.session || !data.user) {
      clearSessionCookies(res)
      res.status(401).json({ error: error?.message || 'Session expired.' })
      return
    }
    setSessionCookies(res, data.session)
    res.json({ user: data.user, access_token: data.session.access_token })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/refresh — explicit refresh using the httpOnly refresh cookie.
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isConfigured || !supabaseAdmin) {
      res.status(503).json({ error: 'API not configured.' })
      return
    }
    const refresh = readCookie(req, REFRESH_TOKEN_COOKIE)
    if (!refresh) {
      res.status(401).json({ error: 'No refresh token.' })
      return
    }
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refresh })
    if (error || !data.session || !data.user) {
      clearSessionCookies(res)
      res.status(401).json({ error: error?.message || 'Session expired.' })
      return
    }
    setSessionCookies(res, data.session)
    res.json({ user: data.user, access_token: data.session.access_token })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/reset-password — trigger Supabase reset email.
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isConfigured || !supabaseAdmin) {
      res.status(503).json({ error: 'API not configured.' })
      return
    }
    const { email } = req.body as AuthBody
    if (!email) {
      badRequest(res, 'Email is required.')
      return
    }
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })
    if (error) {
      res.status(422).json({ error: error.message })
      return
    }
    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

// POST /api/auth/update-password — requires an active session cookie.
router.post('/update-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isConfigured || !supabaseAdmin) {
      res.status(503).json({ error: 'API not configured.' })
      return
    }
    const { password } = req.body as AuthBody
    if (!password) {
      badRequest(res, 'Password is required.')
      return
    }
    const access = readCookie(req, ACCESS_TOKEN_COOKIE)
    if (!access) {
      res.status(401).json({ error: 'Authentication required.' })
      return
    }
    const userClient = createUserClient(access)
    const { data, error } = await userClient.auth.updateUser({ password })
    if (error) {
      res.status(422).json({ error: error.message })
      return
    }
    // updateUser returns the user but does not rotate the session; keep the cookie.
    res.json({ user: data.user })
  } catch (e) {
    next(e)
  }
})

export default router
