import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/db'

// Reads credentials from .env (Vite exposes vars prefixed with VITE_).
// Restart the dev server after changing .env for new values to take effect.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// INTERIM HARDENING: disable session persistence so the refresh token is never
// written to localStorage (where it would be readable by any XSS payload).
// Trade-off: the session lives in memory only, so a page reload clears auth
// and the user must sign in again. This is a stop-gap until the production
// @supabase/ssr httpOnly-cookie flow is adopted (see security notes). We keep
// detectSessionInUrl so email-confirm / OAuth redirects still restore a session
// within the same tab lifetime.
export const supabase = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
      },
    })
  : null