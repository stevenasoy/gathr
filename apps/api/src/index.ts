import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { pathToFileURL } from 'node:url'
import { resolveUser } from './middleware/auth.js'
import type { AuthedRequest } from './types/express.js'
import venuesRouter from './routes/venues.js'
import bookingsRouter from './routes/bookings.js'
import conversationsRouter from './routes/conversations.js'
import messagesRouter from './routes/messages.js'
import reviewsRouter from './routes/reviews.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const isProd = process.env.NODE_ENV === 'production'

// --- Security middleware ---
app.use(helmet())

// Trust the reverse proxy hop count so express-rate-limit reads the real
// client IP from X-Forwarded-For instead of collapsing every caller onto the
// proxy's single IP (which would either never throttle an abuser or trip the
// global bucket for everyone at once). Defaults to 1 in prod, 0 in dev.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? (isProd ? 1 : 0)))

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
// No wildcard origin: if CORS_ORIGIN is unset, deny cross-origin entirely so
// the API is never wide open in production by accident.
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins, credentials: true } : { origin: false }))

app.use(express.json({ limit: '100kb' }))

// Response-time logging + request ID correlation. A unique id is attached to each
// request so log lines can be correlated with Supabase query traces.
morgan.token('req-id', (req: Request) => (req as Request & { id?: string }).id || '-')

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { id?: string }).id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  next()
})
app.use(morgan(':method :url :status :response-time ms - :req-id', { skip: (req) => req.path === '/api/health' }))

// --- Rate limiting ---
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}))

// --- Routes ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Tighter limiter for the public contact form: 3 submissions per 15 minutes
// per IP. The global 100/15min limiter still applies, but this caps the spam
// vector on the one unauthenticated write endpoint.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
})

// Stricter per-user write limiter for authenticated mutation endpoints. Only
// counts POST/PUT/PATCH/DELETE; read traffic is exempt. Keys on authenticated
// user id when available, otherwise falls back to IP.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  keyGenerator: (req: Request) => {
    const userId = (req as AuthedRequest).user?.id
    return userId || (req.ip || req.socket.remoteAddress || 'unknown')
  },
  message: { error: 'Too many writes. Please slow down.' },
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

app.post('/api/contact', contactLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, topic, message } = req.body as {
      name?: string; email?: string; topic?: string; message?: string
    }
    if (!name || !email || !topic || !message) {
      res.status(400).json({ error: 'All fields are required.' })
      return
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'A valid email is required.' })
      return
    }
    // Persist/forward the submission downstream rather than logging PII. For
    // now we only record a non-PII reference so the log stream carries no
    // names, emails, or message bodies.
    console.log('contact submission received', { topic, timestamp: new Date().toISOString() })
    res.json({ success: true, message: 'Message received successfully.' })
  } catch (e) {
    next(e)
  }
})

app.use('/api/venues', resolveUser, writeLimiter, venuesRouter)
app.use('/api/bookings', resolveUser, writeLimiter, bookingsRouter)
app.use('/api/conversations', resolveUser, writeLimiter, conversationsRouter)
app.use('/api/messages', resolveUser, writeLimiter, messagesRouter)
app.use('/api/reviews', resolveUser, writeLimiter, reviewsRouter)

// --- 404 (registered after routes) ---
app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Not found.' }))

// --- Error handler (no stack traces or raw driver messages in production) ---
interface AppError {
  status?: number
  code?: string
  message?: string
  stack?: string
}
app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  let status = err.status || 500
  // Default to the driver/app message so dev stays debuggable; prod may swap
  // this for a generic safe message below depending on the error class.
  let message = err.message || 'Server error.'

  // Map known Postgres error codes to safe, client-facing responses. These
  // generic messages intentionally avoid leaking table/column/constraint names
  // that the raw driver message would otherwise expose.
  if (err.code === '23505') {
    // unique_violation — preserve existing behavior: 409 with the original
    // message (callers may rely on this shape).
    status = 409
  } else if (err.code === '23503') {
    // foreign_key_violation — referential conflict with a related resource.
    status = 409
    if (isProd) message = 'Conflict with related resource.'
  } else if (err.code === '22P02') {
    // invalid_input_syntax — malformed identifier/value sent to Postgres.
    status = 400
    if (isProd) message = 'Invalid input.'
  } else if (status >= 500 && isProd) {
    // Unexpected server errors: never surface raw driver/app messages to
    // clients in production.
    message = 'Something went wrong.'
  }

  const body: { error: string; stack?: string } = { error: message }
  if (!isProd) body.stack = err.stack
  res.status(status).json(body)
})

// Only bind the port when run as the main module (e.g. `node dist/index.js`),
// so tests can import the app without starting a server.
const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false
const server = isMain
  ? app.listen(PORT, () => console.log(`@gathr/api running on http://localhost:${PORT}`))
  : null

// --- Graceful shutdown ---
function shutdown(signal: string): void {
  console.log(`${signal} received, closing server…`)
  server?.close(() => process.exit(0))
  // Force exit if connections won't drain within 10s.
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default app