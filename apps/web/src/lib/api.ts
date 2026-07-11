import { supabase } from './supabase'

// Central API client for the Express backend. Replaces the per-helper pattern
// of `supabase.auth.getSession()` + `fetch` + `throw body.error` so that:
//   - the Bearer token is attached consistently,
//   - a 401 triggers one session refresh + retry, then signs the user out
//     instead of surfacing a raw "Invalid or expired token." error,
//   - a 503 / "API not configured." is normalized to a friendly message and
//     never reaches the UI verbatim.

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

// Fetch an API route with the caller's Supabase access token attached.
// On 401 (auth required/optional): refresh the session once and retry; if that
// still fails or there is no refresh token, sign the user out so the UI does
// not keep firing requests with a dead session.
export async function apiFetch(path: string, opts: ApiFetchOptions = {}): Promise<Response> {
  const { method = 'GET', body, auth = 'required' } = opts
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let token: string | null = null
  if (auth !== 'none') {
    if (!supabase) {
      throw new ApiError(auth === 'required' ? 'Backend not connected.' : FRIENDLY_503, 503)
    }
    const session = (await supabase.auth.getSession()).data.session
    if (session?.access_token) {
      token = session.access_token
      headers['Authorization'] = `Bearer ${token}`
    } else if (auth === 'required') {
      throw new ApiError('Authentication required.', 401)
    }
  }

  const init: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }
  let res = await fetch(path, init)

  if (res.status === 401 && auth !== 'none' && token && supabase) {
    const { data } = await supabase.auth.refreshSession()
    if (data.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`
      res = await fetch(path, { ...init, headers })
    }
    if (!data.session?.access_token || res.status === 401) {
      // Dead session — drop it so the auth context reflects signed-out state.
      await supabase.auth.signOut()
    }
  }

  return res
}

// Fetch + parse JSON, throwing ApiError with a friendly message on any non-OK
// response. Use for the common case where a helper just wants the parsed body.
export async function apiJson<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(path, opts)
  if (!res.ok) throw new ApiError(await readError(res), res.status)
  if (res.status === 204) return null as unknown as T
  return res.json() as Promise<T>
}