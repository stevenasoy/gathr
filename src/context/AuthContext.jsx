import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

const NOT_CONFIGURED = {
  message: 'Accounts are not connected yet. Add your Supabase URL and anon key to .env, then restart the dev server.',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signUp = async ({ name, email, password }) => {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED }
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
  }

  const signIn = async ({ email, password }) => {
    if (!isSupabaseConfigured) return { error: NOT_CONFIGURED }
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut()
  }

  const displayName = user
    ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'there')
    : null

  const value = { user, loading, displayName, signUp, signIn, signOut, configured: isSupabaseConfigured }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
