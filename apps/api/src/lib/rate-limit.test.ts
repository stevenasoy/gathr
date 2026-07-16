import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeRedis = {
  isOpen: true,
  on: vi.fn(),
  connect: vi.fn(),
  sendCommand: vi.fn().mockResolvedValue('sha'),
  quit: vi.fn(),
}

vi.mock('redis', () => ({ createClient: () => fakeRedis }))

import { createRateLimitStore } from './rate-limit.js'

afterEach(() => {
  delete process.env.RATE_LIMIT_REDIS_URL
  process.env.NODE_ENV = 'test'
  fakeRedis.sendCommand.mockClear()
})

describe('rate limit store', () => {
  it('creates a shared store when Redis is configured', () => {
    process.env.NODE_ENV = 'production'
    process.env.RATE_LIMIT_REDIS_URL = 'redis://localhost:6379'

    const store = createRateLimitStore('global')

    expect(store).toBeDefined()
    expect(store?.localKeys).not.toBe(true)
    expect(store?.prefix).toBe('gathr:global:')
  })

  it('fails closed in production when Redis is not configured', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.RATE_LIMIT_REDIS_URL

    expect(() => createRateLimitStore('global')).toThrow('RATE_LIMIT_REDIS_URL')
  })
})
