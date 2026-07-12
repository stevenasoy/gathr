// Verifies the production error-handler branch: raw Supabase/Postgres errors
// are genericized and carry no stack trace. Runs with NODE_ENV=production so
// `exposeErrorDetails` is false at app load (the safe path). The Supabase
// client is mocked; `hoisted.queryError` lets each test choose the error the
// authenticated query returns, so a real route throws and hits the handler.
process.env.NODE_ENV = 'production'
process.env.SUPABASE_URL = 'https://fake-test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'sb_publishable_test_fakefakefakefakefakefake'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-key'
process.env.SUPABASE_JWT_SECRET = '' // force resolveFromCookies to use getUser()

import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'

const hoisted = vi.hoisted(() => ({
  queryError: null as { code?: string; message: string } | null,
  session: null as { access_token: string; refresh_token: string; user: unknown } | null,
}))

vi.mock('@supabase/supabase-js', () => {
  const makeClient = () => {
    const chain: Record<string, unknown> = {
      from: () => chain,
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      order: () => chain,
      range: () => chain,
      limit: () => chain,
      single: () => chain,
      maybeSingle: () => chain,
      then: (resolve: (v: { data: unknown; error: { code?: string; message: string } | null }) => void) =>
        resolve({ data: null, error: hoisted.queryError }),
    }
    const mockUser = { id: 'usr-123', email: 'test@example.com', user_metadata: { full_name: 'Test User' } }
    return {
      from: () => chain,
      auth: {
        getUser: async (token?: string) => {
          if (token && hoisted.session && token === hoisted.session.access_token) {
            return { data: { user: hoisted.session.user }, error: null }
          }
          return { data: { user: null }, error: { message: 'no user' } }
        },
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
          if (email === 'test@example.com' && password === 'password123') {
            hoisted.session = {
              access_token: `token-${Date.now()}`,
              refresh_token: `refresh-${Date.now()}`,
              user: mockUser,
            }
            return { data: { user: mockUser, session: hoisted.session }, error: null }
          }
          return { data: { user: null, session: null }, error: { message: 'Invalid credentials.' } }
        },
        refreshSession: async () => ({ data: { user: null, session: null }, error: { message: 'no' } }),
      },
    }
  }
  return { createClient: () => makeClient() }
})

// Imported AFTER env + mock are in place.
const app = (await import('./index.js')).default

function cookies(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const raw = res.headers['set-cookie']
  if (!raw) return ''
  return Array.isArray(raw) ? raw.join('; ') : raw
}

async function authedBookings() {
  const signin = await request(app)
    .post('/api/auth/signin')
    .send({ email: 'test@example.com', password: 'password123' })
  return request(app).get('/api/bookings').set('Cookie', cookies(signin))
}

describe('error handler — production branch (no internals leak)', () => {
  it('RLS error → 403 generic message, no stack, no policy text', async () => {
    hoisted.queryError = { code: '42501', message: 'new row violates row-level security policy for table "bookings"' }
    const res = await authedBookings()
    expect(res.status).toBe(403)
    expect(res.body.error).toBe("You don't have permission to do that.")
    expect(res.body.stack).toBeUndefined()
    // The raw policy text must NOT be present anywhere in the body.
    expect(JSON.stringify(res.body)).not.toMatch(/row-level|policy|bookings/i)
  })

  it('unique_violation (23505) → 409 generic, no constraint name', async () => {
    hoisted.queryError = { code: '23505', message: 'duplicate key value violates unique constraint "bookings_one_confirmed_per_date"' }
    const res = await authedBookings()
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('That conflicts with an existing record.')
    expect(res.body.stack).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toMatch(/bookings_one_confirmed|constraint|duplicate/i)
  })

  it('invalid_input_syntax (22P02) → 400 generic, no uuid/column detail', async () => {
    hoisted.queryError = { code: '22P02', message: 'invalid input syntax for type uuid: "skyloft-cebu"' }
    const res = await authedBookings()
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid input.')
    expect(res.body.stack).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toMatch(/uuid|skyloft|syntax/i)
  })

  it('unmapped server error → 500 generic, no stack, no raw message', async () => {
    hoisted.queryError = { code: 'XX000', message: 'internal: relation "secret_table" column "secret_col" does not exist' }
    const res = await authedBookings()
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Something went wrong.')
    expect(res.body.stack).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toMatch(/secret|relation|column|internal/i)
  })
})