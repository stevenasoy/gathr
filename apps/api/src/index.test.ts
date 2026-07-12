import { vi } from 'vitest'

vi.hoisted(() => {
  process.env.NODE_ENV = 'test'
  process.env.SUPABASE_URL = 'https://fake-test.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'sb_publishable_test_fakefakefakefakefakefake'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-key'
})

import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from './index.js'

// Mock the Supabase client so tests run fully offline. Every query resolves to
// an empty result set with no error; auth.getUser reports no user so protected
// routes return 401 as expected. Public list/stats endpoints return empty
// arrays/objects, which is enough to assert status + shape.
// In-memory state so auth routes can exercise sign-in / session / refresh.
let mockSession: { access_token: string; refresh_token: string; user: unknown } | null = null

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
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
    }
    const mockUser = { id: 'usr-123', email: 'test@example.com', user_metadata: { full_name: 'Test User' } }
    const makeSession = () => {
      mockSession = {
        access_token: `token-${Date.now()}`,
        refresh_token: `refresh-${Date.now()}`,
        user: mockUser,
      }
      return mockSession
    }
    return {
      from: () => chain,
      auth: {
        getUser: async (token?: string) => {
          if (token && mockSession && token === mockSession.access_token) {
            return { data: { user: mockSession.user }, error: null }
          }
          return { data: { user: null }, error: { message: 'no user' } }
        },
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
          if (email === 'test@example.com' && password === 'password123') {
            const s = makeSession()
            return { data: { user: mockUser, session: s }, error: null }
          }
          return { data: { user: null, session: null }, error: { message: 'Invalid credentials.' } }
        },
        signUp: async ({ email, password: _password, options }: { email: string; password: string; options?: { data?: unknown } }) => {
          if (email === 'taken@example.com') {
            return { data: { user: null, session: null }, error: { message: 'User already registered.' } }
          }
          const s = makeSession()
          return {
            data: { user: { ...mockUser, email, user_metadata: options?.data }, session: s },
            error: null,
          }
        },
        refreshSession: async ({ refresh_token }: { refresh_token: string }) => {
          if (mockSession && refresh_token === mockSession.refresh_token) {
            mockSession.access_token = `token-${Date.now()}-refreshed`
            return { data: { user: mockSession.user, session: mockSession }, error: null }
          }
          return { data: { user: null, session: null }, error: { message: 'Invalid refresh token.' } }
        },
        resetPasswordForEmail: async (_email: string, _options?: unknown) => ({ data: {}, error: null }),
        updateUser: async ({ password }: { password: string }, _token?: string) => {
          if (password.length < 6) return { data: { user: null }, error: { message: 'Password too short.' } }
          return { data: { user: mockUser }, error: null }
        },
      },
    }
  }
  return { createClient: () => makeClient() }
})

describe('API hardening', () => {
  it('GET /api/health → 200', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('POST /api/contact with valid data → 200', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Jane Doe', email: 'jane@example.com', topic: 'general', message: 'Hello!' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toMatch(/received/i)
  })

  it('POST /api/contact with missing fields → 400', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Jane Doe', email: 'jane@example.com' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/required/i)
  })

  it('GET /api/venues without a Bearer token → 200 (public)', async () => {
    const res = await request(app).get('/api/venues')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.venues)).toBe(true)
  })

  it('GET /api/venues/my without a Bearer token → 401 (protected)', async () => {
    const res = await request(app).get('/api/venues/my')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/auth/i)
  })

  it('GET /api/bookings without a Bearer token → 401 (protected)', async () => {
    const res = await request(app).get('/api/bookings')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/auth/i)
  })

  it('GET /api/conversations/guest without a Bearer token → 401 (protected)', async () => {
    const res = await request(app).get('/api/conversations/guest')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/auth/i)
  })

  it('GET /api/messages without a Bearer token → 401 (protected)', async () => {
    const res = await request(app).get('/api/messages')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/auth/i)
  })

  it('GET /api/reviews/stats without a Bearer token → 200 (public)', async () => {
    const res = await request(app).get('/api/reviews/stats')
    expect(res.status).toBe(200)
    expect(res.body.stats).toBeDefined()
  })

  it('unknown route → 404 JSON', async () => {
    const res = await request(app).get('/api/no-such-route')
    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
  })

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['strict-transport-security']).toBeDefined()
  })

  it('CORS denies unlisted origins (no Access-Control-Allow-Origin)', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

function getCookies(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const raw = res.headers['set-cookie']
  if (!raw) return ''
  return Array.isArray(raw) ? raw.join('; ') : raw
}

describe('API auth proxy', () => {
  it('POST /api/auth/signin with valid credentials → 200 + sets cookies', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.user).toBeDefined()
    expect(res.body.access_token).toBeDefined()
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/gathr\.access_token=/),
        expect.stringMatching(/gathr\.refresh_token=/),
      ]),
    )
  })

  it('POST /api/auth/signin with invalid credentials → 401', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('POST /api/auth/signup → 200 + sets cookies', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'new@example.com', password: 'password123', name: 'New User' })
    expect(res.status).toBe(200)
    expect(res.body.user).toBeDefined()
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/gathr\.access_token=/)]),
    )
  })

  it('GET /api/auth/session with valid cookie → 200', async () => {
    const signin = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com', password: 'password123' })
    const res = await request(app).get('/api/auth/session').set('Cookie', getCookies(signin))
    expect(res.status).toBe(200)
    expect(res.body.user).toBeDefined()
    expect(res.body.access_token).toBeDefined()
  })

  it('GET /api/auth/session without cookies → 401', async () => {
    const res = await request(app).get('/api/auth/session')
    expect(res.status).toBe(401)
  })

  it('POST /api/auth/refresh with valid refresh cookie → 200', async () => {
    const signin = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com', password: 'password123' })
    const res = await request(app).post('/api/auth/refresh').set('Cookie', getCookies(signin))
    expect(res.status).toBe(200)
    expect(res.body.access_token).toBeDefined()
  })

  it('POST /api/auth/signout clears cookies', async () => {
    const res = await request(app).post('/api/auth/signout')
    expect(res.status).toBe(200)
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/gathr\.access_token=;/),
        expect.stringMatching(/gathr\.refresh_token=;/),
      ]),
    )
  })

  it('POST /api/auth/reset-password with email → 200', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'test@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('POST /api/auth/update-password with access cookie → 200', async () => {
    const signin = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com', password: 'password123' })
    const res = await request(app)
      .post('/api/auth/update-password')
      .set('Cookie', getCookies(signin))
      .send({ password: 'newpassword123' })
    expect(res.status).toBe(200)
    expect(res.body.user).toBeDefined()
  })

  it('auth cookie protects /api/bookings without Bearer header', async () => {
    const signin = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com', password: 'password123' })
    const res = await request(app).get('/api/bookings').set('Cookie', getCookies(signin))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.bookings)).toBe(true)
  })
})