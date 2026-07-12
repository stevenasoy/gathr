// Intentional, client-safe HTTP error. Throw this from a route when you want a
// specific message to reach the client. The global error handler forwards
// `message` verbatim ONLY for HttpError instances (with `safe = true`); every
// other thrown error (raw Supabase/Postgres/driver errors) is genericized in
// production so table/column/constraint/RLS details never leak.
//
// `safe` defaults to true — the message you pass is assumed to be curated and
// free of internals. Set `safe: false` only if you intentionally want the
// genericized path (rare).
export class HttpError extends Error {
  status: number
  safe: boolean
  constructor(status: number, message: string, safe = true) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.safe = safe
  }
}