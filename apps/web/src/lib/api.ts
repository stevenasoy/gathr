import { setAccessToken } from './supabase'

// Central API client for the Express backend. The session is kept in httpOnly
// cookies set by /api/auth/*; every request includes credentials so the API can
// identify the caller. For direct Supabase calls, we also keep a short-lived
// access token in memory (setAccessToken) which is rotated via the API.

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const FRIENDLY_503 = 'Service is temporarily unavailable. Please try again.'
const FRIENDLY_401 = 'Your session has expired. Please sign in again.'
const FRIENDLY_GENERIC = 'Something went wrong. Please try again.'

type AuthMode = 'required' | 'optional' | 'none'

export interface ApiFetchOptions {
  method?: string
  body?: unknown
  auth?: AuthMode
}

async function readError(res: Response): Promise<string> {
  if (res.status === 401) return FRIENDLY_401
  if (res.status === 503) return FRIENDLY_503
  try {
    const body = await res.json()
    return (body && typeof body.error === 'string' && body.error) || FRIENDLY_GENERIC
  } catch {
    return FRIENDLY_GENERIC
  }
}

async function refreshViaApi(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json() as { access_token?: string }
    if (data.access_token) setAccessToken(data.access_token)
    return data.access_token || null
  } catch (e) {
    console.error('api session refresh failed', e)
    return null
  }
}

// Fetch an API route. The browser sends the httpOnly auth cookies; we also
// refresh a stale in-memory access token on 401 and retry once.
export async function apiFetch(path: string, opts: ApiFetchOptions = {}): Promise<Response> {
  const { method = 'GET', body, auth = 'required' } = opts
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const init: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  }
  let res = await fetch(path, init)

  if (res.status === 401 && auth !== 'none') {
    const fresh = await refreshViaApi()
    if (fresh) {
      res = await fetch(path, { ...init, headers })
    }
    if (res.status === 401 || !fresh) {
      // Dead session — drop the in-memory token so the UI reflects signed-out.
      setAccessToken(null)
    }
  }

  return res
}

// Fetch + parse JSON, throwing ApiError with a friendly message on any non-OK
// response.
export async function apiJson<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(path, opts)
  if (!res.ok) throw new ApiError(await readError(res), res.status)
  if (res.status === 204) return null as unknown as T
  return res.json() as Promise<T>
}
