import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, setAccessToken } from '../lib/supabase'

export interface AuthResult {
  data: { user: User | null; session: Session | null } | null
  error: AuthError | { message: string } | null
}

export interface AuthValue {
  user: User | null
  loading: boolean
  displayName: string | null
  signUp: (creds: { name: string; email: string; password: string }) => Promise<AuthResult>
  signIn: (creds: { email: string; password: string }) => Promise<AuthResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  configured: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

const NOT_CONFIGURED = {
  message: 'Accounts are not connected yet. Add your Supabase URL and anon key to .env, then restart the dev server.',
}

const asMessage = (e: unknown): { message: string } => ({
  message: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
})

function authResultFrom(data: unknown, error: unknown): AuthResult {
  if (error) return { data: null, error: asMessage(error) }
  if (data && typeof data === 'object') {
    const d = data as { user?: User | null; session?: Session | null }
    return { data: { user: d.user ?? null, session: d.session ?? null }, error: null }
  }
  return { data: { user: null, session: null }, error: null }
}

async function apiJson<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = opts
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text()
    let message = 'Something went wrong. Please try again.'
    try {
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed.error === 'string') message = parsed.error
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Bootstrap: ask the API for the current session. The refresh token lives in
  // an httpOnly cookie; the API returns the user + short-lived access token.
  useEffect(() => {
    let active = true
    async function load() {
      if (!supabase) { setLoading(false); return }
      try {
        const { user: u, access_token } = await apiJson<{ user: User | null; access_token?: string }>('/api/auth/session')
        if (active) {
          setUser(u ?? null)
          setAccessToken(access_token || null)
        }
      } catch (e) {
        console.error('auth session load failed', e)
        if (active) {
          setUser(null)
          setAccessToken(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const signUp = useCallback(async ({ name, email, password }: { name: string; email: string; password: string }): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      const res = await apiJson<{ user: User | null; session?: { access_token: string } | null }>('/api/auth/signup', {
        method: 'POST',
        body: { email, password, name },
      })
      setUser(res.user ?? null)
      setAccessToken(res.session?.access_token || null)
      return authResultFrom(res, null)
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }, [])

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      const res = await apiJson<{ user: User; access_token: string }>('/api/auth/signin', {
        method: 'POST',
        body: { email, password },
      })
      setUser(res.user)
      setAccessToken(res.access_token)
      return { data: { user: res.user, session: null }, error: null }
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return
    try {
      await apiJson<{ success: boolean }>('/api/auth/signout', { method: 'POST' })
    } catch (e) {
      console.error('signOut failed', e)
    } finally {
      setUser(null)
      setAccessToken(null)
    }
  }, [])

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      await apiJson<{ success: boolean }>('/api/auth/reset-password', {
        method: 'POST',
        body: { email },
      })
      return { data: { user: null, session: null }, error: null }
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      const res = await apiJson<{ user: User }>('/api/auth/update-password', {
        method: 'POST',
        body: { password },
      })
      setUser(res.user ?? null)
      return { data: { user: res.user ?? null, session: null }, error: null }
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }, [])

  const displayName = useMemo(() => {
    return user
      ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'there')
      : null
  }, [user])

  const value = useMemo(
    () => ({ user, loading, displayName, signUp, signIn, signOut, resetPassword, updatePassword, configured: isSupabaseConfigured }),
    [user, loading, displayName, signUp, signIn, signOut, resetPassword, updatePassword],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
