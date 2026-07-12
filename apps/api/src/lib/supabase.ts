import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/db.js'

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnvFile } from 'node:process'

try {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  loadEnvFile(join(__dirname, '..', '..', '.env'))
} catch {
  // ignore
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

// Server-only admin client (bypasses RLS). Use sparingly and NEVER wire it
// behind a public route — prefer the user-scoped client below so RLS applies.
export const supabaseAdmin: SupabaseClient<Database> | null = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient<Database>(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

// Per-request client scoped to the caller's JWT. RLS evaluates as that user,
// so the API inherits the same row-level rules the web client uses.
export function createUserClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Anonymous client for public endpoints when no user is signed in.
// Cached as a module-level singleton so every public request doesn't recreate
// a SupabaseClient (which opens fresh connection management state).
let anonClientSingleton: SupabaseClient<Database> | null = null
export function createAnonClient(): SupabaseClient<Database> {
  if (!anonClientSingleton) {
    anonClientSingleton = createClient<Database>(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return anonClientSingleton
}