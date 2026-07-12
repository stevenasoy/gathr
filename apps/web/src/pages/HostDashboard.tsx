import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, MapPin, Users, Clock, CalendarCheck, Check, X, Inbox, ChevronLeft, ChevronRight, Plane, Pencil, Eye, EyeOff, ExternalLink, StickyNote } from 'lucide-react'
import Footer from '../components/Footer'

const Messages = lazy(() => import('./Messages'))
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { useMode } from '../context/ModeContext'
import { fetchMyVenues, deleteVenue, setVenueStatus, unitWord } from '../lib/venues'
import { listRequestsForVenues, setBookingStatus } from '../lib/bookings'
import { peso, fmtDate, toYMD, todayYMD } from '../lib/format'
import { srcSet, withWidth, cardSizes } from '../lib/images'
import type { Venue, BookingRow } from '../types'

const MONTHS: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
type TabDef = { id: string; label: string }
const TABS: TabDef[] = [
  { id: 'today', label: 'Today' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'listings', label: 'Listings' },
  { id: 'messages', label: 'Messages' },
]
const BOOKING_FILTERS: TabDef[] = [
  { id: 'all', label: 'All' },
  { id: 'requested', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

export default function HostDashboard() {
  const { user, displayName, loading: authLoading } = useAuth()
  const { refresh: refreshCatalog } = useVenues()
  const { setMode } = useMode()
  const navigate = useNavigate()
  const goTraveling = () => { setMode('traveling'); navigate('/') }
  const [params, setParams] = useSearchParams()
  const initialTab: string = TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as string) : 'today'
  const [tab, setTab] = useState<string>(initialTab)
  const [todayView, setTodayView] = useState<string>('today')
  const [bookingsFilter, setBookingsFilter] = useState<string>('all')
  const [venues, setVenues] = useState<Venue[]>([])
  const [requests, setRequests] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [month, setMonth] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })

  // Keep the active tab in sync with ?tab= (both directions).
  useEffect(() => {
    const t = params.get('tab')
    if (t && TABS.some((x) => x.id === t) && t !== tab) setTab(t)
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps
  const changeTab = (next: string) => {
    setTab(next)
    setParams((p) => { p.set('tab', next); return p }, { replace: true })
  }

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const { data: mine, error: mineErr } = await fetchMyVenues(user.id)
      if (mineErr) throw new Error(mineErr.message)
      setVenues(mine || [])
      const { data: reqs, error: reqErr } = await listRequestsForVenues((mine || []).map((v) => v.id))
      if (reqErr) throw new Error(reqErr.message)
      setRequests(reqs || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your dashboard. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const onDelete = async (id: string) => {
    const active = requests.filter((r) => r.venue_id === id && r.status !== 'cancelled')
    const msg = active.length
      ? `This listing has ${active.length} active booking${active.length > 1 ? 's' : ''}. Deleting it will cancel ${active.length > 1 ? 'them' : 'it'}. Delete anyway?`
      : 'Delete this listing? This cannot be undone.'
    if (!window.confirm(msg)) return
    setError('')
    const prevVenues = venues
    const prevRequests = requests
    try {
      setBusyId(id)
      // Cancel active bookings first so gatherers see 'cancelled' (FK cascade
      // would delete them outright; this preserves the intent).
      const results = await Promise.all(active.map((r) => setBookingStatus(r.id, 'cancelled')))
      const cancelFail = results.find((r) => r && r.error)
      if (cancelFail?.error) throw cancelFail.error
      const { error: delErr } = await deleteVenue(id)
      if (delErr) throw delErr
      setVenues((vs) => vs.filter((v) => v.id !== id))
      setRequests((rs) => rs.map((r) => (r.venue_id === id ? { ...r, status: 'cancelled' } : r)))
      refreshCatalog()
    } catch (e) {
      console.error('delete listing failed', e)
      setVenues(prevVenues)
      setRequests(prevRequests)
      setError('Could not delete the listing. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const onStatus = async (id: string, status: string) => {
    const prev = requests
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    setBusyId(id)
    try {
      const { error: stErr } = await setBookingStatus(id, status)
      if (stErr) throw stErr
    } catch (e) {
      console.error('status update failed', e)
      setRequests(prev)
      setError(status === 'confirmed'
        ? 'Could not confirm. Another booking may already be confirmed for that date.'
        : 'Could not update the request. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const onToggleStatus = async (v: Venue) => {
    const next = v.status === 'live' ? 'unlisted' : 'live'
    const prev = venues
    setVenues((vs) => vs.map((x) => (x.id === v.id ? { ...x, status: next } : x)))
    setBusyId(v.id)
    try {
      const { error: stErr } = await setVenueStatus(v.id, next)
      if (stErr) throw stErr
      refreshCatalog()
    } catch (e) {
      console.error('venue status toggle failed', e)
      setVenues(prev)
      setError('Could not change listing status. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  if (!authLoading && !user) {
    return (
      <>
        <main>
          <section className="page-hero"><div className="wrap">
            <span className="page-eyebrow">For Hosts</span>
            <h1>Host dashboard</h1>
            <p>Sign in to manage your venues and booking requests.</p>
          </div></section>
          <div className="wrap page-body"><div className="empty-state">
            <Inbox size={40} strokeWidth={1.5} />
            <h2>Sign in to host</h2>
            <p>Your listings and requests are tied to your account.</p>
            <Link to="/signin" state={{ from: '/host/dashboard' }} className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Sign in</Link>
          </div></div>
        </main>
        <Footer />
      </>
    )
  }

  const todayStr = todayYMD()
  const byDate = (a: BookingRow, b: BookingRow) => (a.event_date || '').localeCompare(b.event_date || '')
  const pending = requests.filter((r) => r.status === 'requested')
  const todayEvents = requests.filter((r) => r.status === 'confirmed' && r.event_date === todayStr)
  const upcomingEvents = requests
    .filter((r) => r.status === 'confirmed' && (!r.event_date || r.event_date > todayStr))
    .sort(byDate)

  // Full history for the Bookings tab, filtered by status.
  const isCompleted = (r: BookingRow) => r.status === 'confirmed' && !!r.event_date && r.event_date < todayStr
  const bookingsList = requests
    .filter((r) => {
      if (bookingsFilter === 'all') return true
      if (bookingsFilter === 'completed') return isCompleted(r)
      if (bookingsFilter === 'confirmed') return r.status === 'confirmed' && !isCompleted(r)
      return r.status === bookingsFilter
    })
    .sort((a, b) => byDate(b, a)) // most recent first

  return (
    <>
      {/* Host workspace nav */}
      <div className="host-nav">
        <div className="wrap host-nav-row">
          <div className="host-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={'host-tab' + (tab === t.id ? ' on' : '')} onClick={() => changeTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="host-nav-right">
            <button className="host-link" onClick={goTraveling} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Plane size={16} /> Switch to gathering
            </button>
            <Link to="/host/new" className="btn-primary" style={{ width: 'auto', padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Plus size={16} /> Add a venue
            </Link>
          </div>
        </div>
      </div>

      <main className="wrap page-body">
        {error && (
          <div className="form-error" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{error}</span>
            <button className="btn-clear" onClick={load} style={{ color: 'inherit' }}>Retry</button>
          </div>
        )}
        {loading || authLoading ? (
          <div className="empty-state"><p>Loading your dashboard…</p></div>
        ) : (
          <>
            {/* ---------- TODAY ---------- */}
            {tab === 'today' && (
              <>
                <h1 className="dash-title">Welcome back{displayName ? `, ${displayName}` : ''}.</h1>

                <div className="today-pills">
                  <button className={'today-pill' + (todayView === 'today' ? ' on' : '')} onClick={() => setTodayView('today')}>Today</button>
                  <button className={'today-pill' + (todayView === 'upcoming' ? ' on' : '')} onClick={() => setTodayView('upcoming')}>
                    Upcoming{upcomingEvents.length > 0 && <span className="count-pill" style={{ marginLeft: 6 }}>{upcomingEvents.length}</span>}
                  </button>
                </div>

                {todayView === 'today' ? (
                  pending.length === 0 && todayEvents.length === 0 ? (
                    <div className="empty-state">
                      <CalendarCheck size={40} strokeWidth={1.5} />
                      <h2>You don't have any reservations</h2>
                      <p>When guests request your venues, they'll show up here for you to confirm.</p>
                      {venues.length === 0 && <Link to="/host/new" className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>List your first space</Link>}
                    </div>
                  ) : (
                    <>
                      <h2 className="dash-h2"><Inbox size={20} /> Pending requests {pending.length > 0 && <span className="count-pill">{pending.length}</span>}</h2>
                      {pending.length ? (
                        <div className="booking-list" style={{ marginBottom: 38 }}>
                          {pending.map((b) => <RequestRow key={b.id} b={b} onStatus={onStatus} />)}
                        </div>
                      ) : <p className="dash-muted" style={{ marginBottom: 38 }}>No pending requests right now.</p>}

                      <h2 className="dash-h2"><CalendarCheck size={20} /> Happening today</h2>
                      {todayEvents.length ? (
                        <div className="booking-list">
                          {todayEvents.map((b) => <RequestRow key={b.id} b={b} onStatus={onStatus} />)}
                        </div>
                      ) : <p className="dash-muted">Nothing scheduled for today.</p>}
                    </>
                  )
                ) : (
                  upcomingEvents.length ? (
                    <div className="booking-list">
                      {upcomingEvents.map((b) => <RequestRow key={b.id} b={b} onStatus={onStatus} />)}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <CalendarCheck size={40} strokeWidth={1.5} />
                      <h2>No upcoming events</h2>
                      <p>Confirmed bookings with a future date will appear here.</p>
                    </div>
                  )
                )}
              </>
            )}

            {/* ---------- CALENDAR ---------- */}
            {tab === 'calendar' && (
              <CalendarTab month={month} setMonth={setMonth} requests={requests} />
            )}

            {/* ---------- BOOKINGS (history) ---------- */}
            {tab === 'bookings' && (
              <>
                <h1 className="dash-title">Bookings</h1>
                <div className="today-pills" style={{ flexWrap: 'wrap' }}>
                  {BOOKING_FILTERS.map((f) => (
                    <button key={f.id} className={'today-pill' + (bookingsFilter === f.id ? ' on' : '')} onClick={() => setBookingsFilter(f.id)}>{f.label}</button>
                  ))}
                </div>
                {bookingsList.length ? (
                  <div className="booking-list">
                    {bookingsList.map((b) => <RequestRow key={b.id} b={b} onStatus={onStatus} />)}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '36px 20px' }}>
                    <p>No {bookingsFilter === 'all' ? '' : bookingsFilter + ' '}bookings yet.</p>
                  </div>
                )}
              </>
            )}

            {/* ---------- LISTINGS ---------- */}
            {tab === 'listings' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h1 className="dash-title" style={{ margin: 0 }}>Your listings</h1>
                </div>
                {venues.length ? (
                  <div className="grid">
                    {venues.map((v) => (
                      <div className="card host-card-item" key={v.id}>
                        <Link to={`/host/edit/${v.id}`} className="card-media" style={{ display: 'block', aspectRatio: '3/2' }}>
                          <img
                            src={withWidth(v.images[0], 600)}
                            alt={v.name}
                            loading="lazy"
                            decoding="async"
                            width={600}
                            height={400}
                            sizes={cardSizes}
                            srcSet={srcSet(v.images[0], [400, 600])}
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <span className={'card-badge status-pill ' + (v.status === 'live' ? 'status-confirmed' : 'status-cancelled')}>
                            {v.status === 'live' ? 'Live' : 'Unlisted'}
                          </span>
                        </Link>
                        <div className="card-body">
                          <div className="card-top"><span className="card-name">{v.name}</span></div>
                          <div className="card-sub">{v.area ? `${v.area}, ` : ''}{v.city}</div>
                          <div className="card-price"><b>{peso(v.pricePerHour)}</b> / {unitWord(v.priceUnit)}</div>
                          <div className="listing-actions">
                            <Link to={`/host/edit/${v.id}`} className="listing-action"><Pencil size={14} /> Edit</Link>
                            <button className="listing-action" onClick={() => onToggleStatus(v)} disabled={busyId === v.id}>
                              {v.status === 'live' ? <><EyeOff size={14} /> Unlist</> : <><Eye size={14} /> List</>}
                            </button>
                            {v.status === 'live' && (
                              <Link to={`/venue/${v.id}`} className="listing-action"><ExternalLink size={14} /> View</Link>
                            )}
                            <button className="listing-action danger" onClick={() => onDelete(v.id)} disabled={busyId === v.id}><Trash2 size={14} /> Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MapPin size={40} strokeWidth={1.5} />
                    <h2>No listings yet</h2>
                    <p>Add your first venue and it goes live on Gathr right away.</p>
                    <Link to="/host/new" className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Add a venue</Link>
                  </div>
                )}
              </>
            )}

            {/* ---------- MESSAGES ---------- */}
            {tab === 'messages' && (
              <>
                <h1 className="dash-title">Messages</h1>
                <Suspense fallback={<p className="dash-muted">Loading messages…</p>}>
                  <Messages role="host" embedded />
                </Suspense>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  )
}

function RequestRow({ b, onStatus }: { b: BookingRow; onStatus: (id: string, status: string) => void }) {
  return (
    <div className="booking-row">
      <div className="booking-row-main">
        <div className="booking-row-top">
          <Link to={`/bookings/${b.id}`} className="booking-venue">{b.venue_name}</Link>
          <span className={'status-pill status-' + b.status}>{b.status}</span>
        </div>
        <div className="booking-row-meta">
          <span><CalendarCheck size={15} /> {fmtDate(b.event_date)}</span>
          {b.event_type && <span><MapPin size={15} /> {b.event_type}</span>}
          <span><Clock size={15} /> {b.hours} hrs</span>
          {b.guests && <span><Users size={15} /> {b.guests} guests</span>}
          <span><b style={{ color: 'var(--ink)' }}>{peso(b.total_php)}</b></span>
        </div>
        {b.note && <div className="req-note"><StickyNote size={15} /> <span>{b.note}</span></div>}
      </div>
      {b.status === 'requested' && (
        <div className="booking-row-side" style={{ flexDirection: 'row', gap: 8 }}>
          <button className="btn-confirm" onClick={() => onStatus(b.id, 'confirmed')}><Check size={15} /> Confirm</button>
          <button className="btn-decline" onClick={() => onStatus(b.id, 'cancelled')}><X size={15} /> Decline</button>
        </div>
      )}
    </div>
  )
}

function CalendarTab({ month, setMonth, requests }: { month: Date; setMonth: (d: Date) => void; requests: BookingRow[] }) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDow = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const todayStr = todayYMD()

  // group bookings (exclude cancelled) by date
  const byDate: Record<string, BookingRow[]> = {}
  requests.filter((r) => r.status !== 'cancelled' && r.event_date).forEach((r) => {
    const key = r.event_date as string
    ;(byDate[key] = byDate[key] || []).push(r)
  })

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <>
      <div className="cal-head">
        <h1 className="dash-title" style={{ margin: 0 }}>{MONTHS[m]} {year}</h1>
        <div className="cal-nav">
          <button onClick={() => setMonth(new Date(year, m - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <button onClick={() => setMonth(new Date())} className="cal-today-btn">Today</button>
          <button onClick={() => setMonth(new Date(year, m + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div className="cal-cell empty" key={'e' + i} />
          const ds = toYMD(new Date(year, m, d))
          const items = byDate[ds] || []
          return (
            <div className={'cal-cell' + (ds === todayStr ? ' is-today' : '')} key={ds}>
              <span className="cal-day">{d}</span>
              {items.slice(0, 3).map((r) => (
                <Link to={`/venue/${r.venue_id}`} key={r.id} className={'cal-event status-' + r.status} title={`${r.venue_name} · ${r.status}`}>
                  {r.venue_name}
                </Link>
              ))}
              {items.length > 3 && <span className="cal-more">+{items.length - 3} more</span>}
            </div>
          )
        })}
      </div>
      <div className="cal-legend">
        <span><i className="dot status-requested" /> Requested</span>
        <span><i className="dot status-confirmed" /> Confirmed</span>
      </div>
    </>
  )
}
