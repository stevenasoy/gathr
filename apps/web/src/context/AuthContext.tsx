import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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

// supabase-js v2 returns slightly different response shapes for signUp/signIn
// vs password reset/update. Normalize them into our AuthResult type.
function authResultFrom(data: unknown, error: unknown): AuthResult {
  if (error) return { data: null, error: asMessage(error) }
  if (data && typeof data === 'object') {
    const d = data as { user?: User | null; session?: Session | null }
    return { data: { user: d.user ?? null, session: d.session ?? null }, error: null }
  }
  return { data: { user: null, session: null }, error: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!supabase) { setLoading(false); return }

    supabase.auth.getSession()
      .then(({ data }) => { if (active) setUser(data.session?.user ?? null) })
      .catch((e) => console.error('auth session load failed', e))
      .finally(() => { if (active) setLoading(false) })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async ({ name, email, password }: { name: string; email: string; password: string }): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      return authResultFrom(data, error)
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }, [])

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      return authResultFrom(data, error)
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('signOut failed', e)
    }
  }, [])

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return authResultFrom(data, error)
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      const { data, error } = await supabase.auth.updateUser({ password })
      return authResultFrom(data, error)
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