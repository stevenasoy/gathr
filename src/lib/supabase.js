import { createClient } from '@supabase/supabase-js'

// Reads credentials from .env (Vite exposes vars prefixed with VITE_).
// Restart the dev server after changing .env for new values to take effect.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
