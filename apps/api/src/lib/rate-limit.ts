import { RedisStore } from 'rate-limit-redis'
import { createClient } from 'redis'
import type { Store } from 'express-rate-limit'

type RedisClient = ReturnType<typeof createClient>

let client: RedisClient | undefined
let connectPromise: Promise<unknown> | undefined

function getRedisClient(url: string): RedisClient {
  if (client) return client

  client = createClient({ url })
  client.on('error', (error) => console.error('rate-limit redis error', error))
  return client
}

/**
 * Build a rate-limit store. Production intentionally fails closed without a
 * shared Redis URL so a second API replica cannot silently bypass throttles.
 */
export function createRateLimitStore(prefix: string): Store | undefined {
  const url = process.env.RATE_LIMIT_REDIS_URL?.trim()
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RATE_LIMIT_REDIS_URL is required in production')
    }
    return undefined
  }

  const redis = getRedisClient(url)
  return new RedisStore({
    prefix: `gathr:${prefix}:`,
    sendCommand: async (command, ...args) => {
      if (!redis.isOpen) connectPromise ??= redis.connect()
      if (connectPromise) await connectPromise
      return redis.sendCommand([command, ...args]) as Promise<string | number | boolean | (string | number | boolean)[]>
    },
  })
}

export async function closeRateLimitStore(): Promise<void> {
  if (client?.isOpen) await client.quit()
  client = undefined
  connectPromise = undefined
}



