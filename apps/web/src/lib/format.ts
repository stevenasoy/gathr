// Shared display formatters. One definition each — pages must import from
// here, not redefine locally (drift between local copies caused a UTC/local
// date bug once already).

export const peso = (n: number | null | undefined): string =>
  '₱' + Number(n || 0).toLocaleString('en-PH')

// event_date is a plain YYYY-MM-DD. Appending T00:00:00 parses it in LOCAL
// time; bare new Date('YYYY-MM-DD') would parse as UTC and can shift a day.
const DATE_STYLES = {
  long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  short: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  compact: { month: 'short', day: 'numeric', year: 'numeric' },
} as const

export type DateFormatStyle = keyof typeof DATE_STYLES

export const fmtDate = (d: string | null, style: DateFormatStyle = 'short'): string =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', DATE_STYLES[style]) : 'Date flexible'

// Timestamps (created_at): time-of-day without / with the year.
export const fmtTime = (ts: string): string =>
  new Date(ts).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export const fmtWhen = (ts: string | null | undefined): string =>
  ts ? new Date(ts).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

// Local-time YYYY-MM-DD, for comparing against event_date. Never use
// toISOString() for this — that's UTC and lags PH time by 8 hours.
const pad = (n: number): string => String(n).padStart(2, '0')
export const toYMD = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayYMD = (): string => toYMD(new Date())