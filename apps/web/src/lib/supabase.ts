import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/db'

// Reads credentials from .env (Vite exposes vars prefixed with VITE_).
// Restart the dev server after changing .env for new values to take effect.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Default anonymous client. With the API-side httpOnly-cookie auth flow, the web
// app no longer stores the session via supabase-js; this client is used only for
// unauthenticated public reads and realtime subscriptions that carry their own token.
export const supabase = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
      },
    })
  : null

// Module-level access token managed by AuthContext. Direct Supabase calls (e.g.
// saved venues, realtime notifications) use this token instead of supabase-js
// storage. The long-lived refresh token stays in an httpOnly API cookie.
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

// Create a Supabase client scoped to the current access token.
export function createUserSupabase(): ReturnType<typeof createClient<Database>> {
  if (!isSupabaseConfigured || !url || !anonKey) {
    throw new Error('Supabase is not configured.')
  }
  const token = accessToken
  if (!token) {
    throw new Error('No access token available.')
  }
  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true },
  })
}
