// Lightweight cookie helpers. We avoid pulling in cookie-parser as a dependency
// by parsing/serializing cookies manually; this keeps the API's dependency
// surface small while still supporting httpOnly Secure SameSite cookies.

import type { Response, Request } from 'express'

const isSecure = !['development', 'test'].includes(process.env.NODE_ENV || '')

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  maxAge?: number // seconds
  path?: string
}

export function setCookie(
  res: Response,
  name: string,
  value: string,
  opts: CookieOptions = {},
): void {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`)
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`)
  if (opts.path) parts.push(`Path=${opts.path}`)
  res.append('Set-Cookie', parts.join('; '))
}

export function clearCookie(res: Response, name: string, path = '/'): void {
  res.append('Set-Cookie', `${name}=; Max-Age=0; Path=${path}`)
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

// Cookie names used for the Supabase Auth session proxy.
export const ACCESS_TOKEN_COOKIE = 'gathr.access_token'
export const REFRESH_TOKEN_COOKIE = 'gathr.refresh_token'

// Default cookie flags for auth tokens. In production everything is Secure +
// SameSite=Lax. Dev allows non-secure so localhost testing works.
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    path: '/',
    // Access token lifetime matches Supabase default (1h). The cookie expiry is
    // a UX hint only; the token itself carries the real expiration.
    maxAge: 60 * 60,
  }
}

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    path: '/api/auth',
    // Refresh token lifetime: Supabase default is ~30 days. Keep the cookie in
    // sync so a stale cookie doesn't hang around forever.
    maxAge: 30 * 24 * 60 * 60,
  }
}
