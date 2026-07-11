// Fake test fixtures — NO real Supabase credentials. The supabase client layer
// is mocked (see vi.mock below) so these tests never reach the network; the env
// vars exist only to satisfy any module that reads them at load time.
process.env.SUPABASE_URL = 'https://fake-test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'sb_publishable_test_fakefakefakefakefakefake'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-key'

import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app from './index.js'

// Mock the Supabase client so tests run fully offline. Every query resolves to
// an empty result set with no error; auth.getUser reports no user so protected
// routes return 401 as expected. Public list/stats endpoints return empty
// arrays/objects, which is enough to assert status + shape.
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
    return {
      from: () => chain,
      auth: { getUser: async () => ({ data: { user: null }, error: { message: 'no user' } }) },
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