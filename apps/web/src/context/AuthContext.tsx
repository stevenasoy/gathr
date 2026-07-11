import { createContext, useContext, useEffect, useState } from 'react'
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
  configured: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

const NOT_CONFIGURED = {
  message: 'Accounts are not connected yet. Add your Supabase URL and anon key to .env, then restart the dev server.',
}

const asMessage = (e: unknown): { message: string } => ({
  message: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
})

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

  const signUp = async ({ name, email, password }: { name: string; email: string; password: string }): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      return await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }

  const signIn = async ({ email, password }: { email: string; password: string }): Promise<AuthResult> => {
    if (!supabase) return { data: null, error: NOT_CONFIGURED }
    try {
      return await supabase.auth.signInWithPassword({ email, password })
    } catch (e) {
      return { data: null, error: asMessage(e) }
    }
  }

  const signOut = async (): Promise<void> => {
    if (!supabase) return
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('signOut failed', e)
    }
  }

  const displayName = user
    ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'there')
    : null

  const value: AuthValue = { user, loading, displayName, signUp, signIn, signOut, configured: isSupabaseConfigured }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}