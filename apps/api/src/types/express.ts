import type { Request } from 'express'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from './db.js'

// A request that has passed `requireAuth`: the Supabase user + a user-scoped
// client (RLS applies as that user) are attached. Used as the handler param
// type on authed routes; non-authed routes keep the plain `Request`.
export type AuthedRequest = Request & {
  user: User
  supabase: SupabaseClient<Database>
}