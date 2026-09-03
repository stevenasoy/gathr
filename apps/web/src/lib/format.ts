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

// Booking start_time comes from a Postgres `time` column as HH:MM or HH:MM:SS.
// Render as a 12-hour clock ("2:00 PM"). Empty input means the whole day.
export const fmtClock = (t: string | null | undefined): string => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}

// "2:00 PM to 6:00 PM" from a start time and a duration in hours. Wraps past
// midnight. Falls back to "Whole day" when there is no start time.
export const fmtSlot = (start: string | null | undefined, hours: number): string => {
  if (!start) return 'Whole day'
  const [h, m] = start.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 'Whole day'
  const endMinutes = (h * 60 + m + Math.round(hours * 60)) % (24 * 60)
  const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
  return `${fmtClock(start)} to ${fmtClock(end)}`
}

// Local-time YYYY-MM-DD, for comparing against event_date. Never use
// toISOString() for this — that's UTC and lags PH time by 8 hours.
const pad = (n: number): string => String(n).padStart(2, '0')
export const toYMD = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayYMD = (): string => toYMD(new Date())