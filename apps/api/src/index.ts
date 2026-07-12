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
import authRouter from './routes/auth.js'
import { HttpError } from './lib/errors.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const isProd = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
// Raw error details (message + stack) are exposed ONLY in explicit dev/test.
// Anything else — including an unset NODE_ENV, staging, or a prod misconfig —
// gets the genericized safe path so internals never leak by accident.
const exposeErrorDetails = isTest || process.env.NODE_ENV === 'development'

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
const noOpRateLimit = (_req: Request, _res: Response, next: NextFunction) => next()

app.use(isTest ? noOpRateLimit : rateLimit({
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
const contactLimiter = isTest ? noOpRateLimit : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
})

// Stricter per-user write limiter for authenticated mutation endpoints. Only
// counts POST/PUT/PATCH/DELETE; read traffic is exempt. Keys on authenticated
// user id when available, otherwise falls back to IP.
const writeLimiter = isTest ? noOpRateLimit : rateLimit({
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

// Auth-specific rate limiters. Credential traffic bypassed the global limiter in
// the previous architecture; now it flows through the API and must be strictly
// capped per IP + per email to prevent brute-force and signup abuse.
const authIpLimiter = isTest ? noOpRateLimit : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
  message: { error: 'Too many attempts from this network. Please try again later.' },
})

const authEmailLimiter = isTest ? noOpRateLimit : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.body?.email,
  keyGenerator: (req: Request) => req.body?.email || req.ip || 'unknown',
  message: { error: 'Too many attempts for this email. Please try again later.' },
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

// Apply strict credential/sign-up rate limiting only to sensitive endpoints.
app.use('/api/auth/signup', authIpLimiter, authEmailLimiter)
app.use('/api/auth/signin', authIpLimiter, authEmailLimiter)
app.use('/api/auth/reset-password', authIpLimiter, authEmailLimiter)
app.use('/api/auth/update-password', authIpLimiter, authEmailLimiter)
// The remaining auth endpoints (like /session, /signout, /refresh) bypass the
// aggressive 10/15min brute-force limiter and fall back to the global 100/15min limit.
app.use('/api/auth', authRouter)

app.use('/api/venues', resolveUser, writeLimiter, venuesRouter)
app.use('/api/bookings', resolveUser, writeLimiter, bookingsRouter)
app.use('/api/conversations', resolveUser, writeLimiter, conversationsRouter)
app.use('/api/messages', resolveUser, writeLimiter, messagesRouter)
app.use('/api/reviews', resolveUser, writeLimiter, reviewsRouter)

// --- 404 (registered after routes) ---
app.use((_req: Request, res: Response) => res.status(404).json({ error: 'Not found.' }))

// --- Error handler (no stack traces or raw driver messages in production) ---
// Only HttpError carries a curated, client-safe message. Everything else
// (raw Supabase/Postgres/driver errors — RLS policy text, constraint names,
// column/uuid syntax errors, etc.) is genericized in prod so internals never
// reach the client. Full error is always logged server-side.
interface AppError {
  status?: number
  code?: string
  message?: string
  stack?: string
}

// RLS / permission-denied errors. PostgREST reports these as PG code 42501
// or with "row-level security" / "permission denied" in the message; either
// way the raw text reveals the security mechanism, so it must be genericized.
function isPermissionError(err: AppError): boolean {
  if (err.code === '42501') return true
  return /row-level security|permission denied/i.test(err.message || '')
}

app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)

  // Intentional, client-safe message from a route — forward verbatim.
  if (err instanceof HttpError && err.safe) {
    const body: { error: string; stack?: string } = { error: err.message }
    if (exposeErrorDetails) body.stack = err.stack
    res.status(err.status).json(body)
    return
  }

  // Map known Postgres codes to the right status. Messages are genericized
  // unless we're in explicit dev/test; otherwise the raw message is preserved
  // for debugging.
  let status = err.status || 500
  if (err.code === '23505') status = 409       // unique_violation
  else if (err.code === '23503') status = 409  // foreign_key_violation
  else if (err.code === '22P02') status = 400  // invalid_input_syntax (e.g. bad uuid)
  else if (isPermissionError(err)) status = 403 // RLS / permission denied

  if (exposeErrorDetails) {
    res.status(status).json({ error: err.message || 'Server error.', stack: err.stack })
    return
  }

  // Anything not explicit dev/test (prod, staging, unset NODE_ENV): never
  // surface raw driver/pg/supabase messages.
  const safeMessage =
    err.code === '23505' ? 'That conflicts with an existing record.' :
    err.code === '23503' ? 'Conflict with related resource.' :
    err.code === '22P02' ? 'Invalid input.' :
    status === 403 ? "You don't have permission to do that." :
    status >= 500 ? 'Something went wrong.' :
    'We couldn\'t complete that request. Please try again.'
  res.status(status).json({ error: safeMessage })
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