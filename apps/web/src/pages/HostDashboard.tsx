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
          <section className="py-14 pb-10 bg-surface border-b border-line text-center">
            <div className="max-w-wrap mx-auto px-10">
              <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">For Hosts</span>
              <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Host dashboard</h1>
              <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">Sign in to manage your venues and booking requests.</p>
            </div>
          </section>
          <div className="max-w-wrap mx-auto px-10 py-12 pb-20">
            <div className="text-center py-[60px] px-5 text-ink-soft">
              <Inbox size={40} strokeWidth={1.5} className="mb-3.5 mx-auto text-ink-faint" />
              <h2 className="text-[22px] font-extrabold mb-2 text-ink">Sign in to host</h2>
              <p className="max-w-[460px] mx-auto mb-5 text-[15px] leading-relaxed">Your listings and requests are tied to your account.</p>
              <Link to="/signin" state={{ from: '/host/dashboard' }} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Sign in</Link>
            </div>
          </div>
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
      <div className="relative z-[35] bg-white border-b border-line">
        <div className="max-w-wrap mx-auto px-10 flex items-center justify-between h-[60px] gap-4">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t.id} className={`py-2 px-3.5 rounded-full font-semibold text-[15px] transition-colors duration-150 ${tab === t.id ? 'text-ink bg-tint' : 'text-ink-soft hover:bg-tint hover:text-ink'}`} onClick={() => changeTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <button className="host-link" onClick={goTraveling} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Plane size={16} /> Switch to gathering
            </button>
            <Link to="/host/new" className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Plus size={16} /> Add a venue
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-wrap mx-auto px-10 py-12 pb-20">
        {error && (
          <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mb-[18px] flex justify-between gap-3">
            <span>{error}</span>
            <button className="font-semibold text-[13px] hover:underline" onClick={load} style={{ color: 'inherit' }}>Retry</button>
          </div>
        )}
        {loading || authLoading ? (
          <div className="text-center py-[60px] px-5 text-ink-soft"><p>Loading your dashboard…</p></div>
        ) : (
          <>
            {/* ---------- TODAY ---------- */}
            {tab === 'today' && (
              <>
                <h1 className="text-[28px] font-extrabold my-2 mb-5">Welcome back{displayName ? `, ${displayName}` : ''}.</h1>

                <div className="inline-flex gap-2 mb-6">
                  <button className={`py-2 px-5 rounded-full font-semibold text-[15px] inline-flex items-center transition-colors duration-150 ${todayView === 'today' ? 'bg-ink text-white' : 'bg-tint text-ink hover:bg-line-strong'}`} onClick={() => setTodayView('today')}>Today</button>
                  <button className={`py-2 px-5 rounded-full font-semibold text-[15px] inline-flex items-center transition-colors duration-150 ${todayView === 'upcoming' ? 'bg-ink text-white' : 'bg-tint text-ink hover:bg-line-strong'}`} onClick={() => setTodayView('upcoming')}>
                    Upcoming{upcomingEvents.length > 0 && <span className="inline-grid place-items-center min-w-[22px] h-[22px] px-[7px] rounded-full bg-brand text-white text-xs font-bold ml-1.5">{upcomingEvents.length}</span>}
                  </button>
                </div>

                {todayView === 'today' ? (
                  pending.length === 0 && todayEvents.length === 0 ? (
                    <div className="text-center py-[60px] px-5 text-ink-soft">
                      <CalendarCheck size={40} strokeWidth={1.5} className="mb-3.5 mx-auto text-ink-faint" />
                      <h2 className="text-[22px] font-extrabold mb-2 text-ink">You don't have any reservations</h2>
                      <p className="max-w-[460px] mx-auto mb-5 text-[15px] leading-relaxed">When guests request your venues, they'll show up here for you to confirm.</p>
                      {venues.length === 0 && <Link to="/host/new" className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>List your first space</Link>}
                    </div>
                  ) : (
                    <>
                      <h2 className="text-[19px] font-extrabold flex items-center gap-2 m-0 mb-4"><Inbox size={20} className="text-brand" /> Pending requests {pending.length > 0 && <span className="inline-grid place-items-center min-w-[22px] h-[22px] px-[7px] rounded-full bg-brand text-white text-xs font-bold">{pending.length}</span>}</h2>
                      {pending.length ? (
                        <div className="flex flex-col gap-3.5" style={{ marginBottom: 38 }}>
                          {pending.map((b) => <RequestRow key={b.id} b={b} onStatus={onStatus} />)}
                        </div>
                      ) : <p className="text-ink-soft text-[15px] mb-[38px]">No pending requests right now.</p>}

                      <h2 className="text-[19px] font-extrabold flex items-center gap-2 m-0 mb-4"><CalendarCheck size={20} className="text-brand" /> Happening today</h2>
                      {todayEvents.length ? (
                        <div className="flex flex-col gap-3.5">
                          {todayEvents.map((b) => <RequestRow key={b.id} b={b} onStatus={onStatus} />)}
                        </div>
                      ) : <p className="text-ink-soft text-[15px]">Nothing scheduled for today.</p>}
                    </>
                  )
                ) : (
                  upcomingEvents.length ? (
                    <div className="flex flex-col gap-3.5">
                      {upcomingEvents.map((b) => <RequestRow key={b.id} b={b} onStatus={onStatus} />)}
                    </div>
                  ) : (
                    <div className="text-center py-[60px] px-5 text-ink-soft">
                      <CalendarCheck size={40} strokeWidth={1.5} className="mb-3.5 mx-auto text-ink-faint" />
                      <h2 className="text-[22px] font-extrabold mb-2 text-ink">No upcoming events</h2>
                      <p className="max-w-[460px] mx-auto mb-5 text-[15px] leading-relaxed">Confirmed bookings with a future date will appear here.</p>
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
                <h1 className="text-[28px] font-extrabold my-2 mb-5">Bookings</h1>
                <div className="inline-flex gap-2 mb-6 flex-wrap">
                  {BOOKING_FILTERS.map((f) => (
                    <button key={f.id} className={`py-2 px-5 rounded-full font-semibold text-[15px] inline-flex items-center transition-colors duration-150 ${bookingsFilter === f.id ? 'bg-ink text-white' : 'bg-tint text-ink hover:bg-line-strong'}`} onClick={() => setBookingsFilter(f.id)}>{f.label}</button>
                  ))}
                </div>
                {bookingsList.length ? (
                  <div className="flex flex-col gap-3.5">
                    {bookingsList.map((b) => <RequestRow key={b.id} b={b} onStatus={onStatus} />)}
                  </div>
                ) : (
                  <div className="text-center py-9 px-5 text-ink-soft">
                    <p>No {bookingsFilter === 'all' ? '' : bookingsFilter + ' '}bookings yet.</p>
                  </div>
                )}
              </>
            )}

            {/* ---------- LISTINGS ---------- */}
            {tab === 'listings' && (
              <>
                <div className="flex justify-between items-center mb-[18px]">
                  <h1 className="text-[28px] font-extrabold m-0">Your listings</h1>
                </div>
                {venues.length ? (
                  <div className="grid">
                    {venues.map((v) => (
                      <div className="border border-line rounded-lg overflow-hidden" key={v.id}>
                        <Link to={`/host/edit/${v.id}`} className="block relative aspect-[3/2] rounded-none overflow-hidden bg-gradient border-b border-line">
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
                            className="w-full h-full object-cover"
                          />
                          <span className={`absolute top-3 left-3 bg-white/[0.96] text-ink text-[11px] font-bold uppercase tracking-[0.05em] py-[5px] px-2.5 rounded-full shadow-card border border-black/[0.04] ${v.status === 'live' ? 'bg-[#e6f6ec] text-[#137a3c]' : 'bg-tint text-ink-soft'}`}>
                            {v.status === 'live' ? 'Live' : 'Unlisted'}
                          </span>
                        </Link>
                        <div className="p-4 pb-4">
                          <div className="flex justify-between gap-2.5 items-baseline"><span className="font-outfit font-bold text-base text-ink tracking-[-0.01em]">{v.name}</span></div>
                          <div className="text-ink-soft text-[13.5px] mt-0.5">{v.area ? `${v.area}, ` : ''}{v.city}</div>
                          <div className="mt-1.5 text-sm text-ink-soft"><b className="font-mono font-bold text-[15.5px] text-ink">{peso(v.pricePerHour)}</b> / {unitWord(v.priceUnit)}</div>
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-line">
                            <Link to={`/host/edit/${v.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft py-1.5 px-2.5 rounded-lg border border-line-strong bg-white transition-colors duration-150 hover:bg-tint hover:text-ink"><Pencil size={14} /> Edit</Link>
                            <button className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft py-1.5 px-2.5 rounded-lg border border-line-strong bg-white transition-colors duration-150 hover:bg-tint hover:text-ink" onClick={() => onToggleStatus(v)} disabled={busyId === v.id}>
                              {v.status === 'live' ? <><EyeOff size={14} /> Unlist</> : <><Eye size={14} /> List</>}
                            </button>
                            {v.status === 'live' && (
                              <Link to={`/venue/${v.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft py-1.5 px-2.5 rounded-lg border border-line-strong bg-white transition-colors duration-150 hover:bg-tint hover:text-ink"><ExternalLink size={14} /> View</Link>
                            )}
                            <button className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#a01230] py-1.5 px-2.5 rounded-lg border border-[#f1c9d2] bg-white transition-colors duration-150 hover:bg-[#fdecef]" onClick={() => onDelete(v.id)} disabled={busyId === v.id}><Trash2 size={14} /> Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-[60px] px-5 text-ink-soft">
                    <MapPin size={40} strokeWidth={1.5} className="mb-3.5 mx-auto text-ink-faint" />
                    <h2 className="text-[22px] font-extrabold mb-2 text-ink">No listings yet</h2>
                    <p className="max-w-[460px] mx-auto mb-5 text-[15px] leading-relaxed">Add your first venue and it goes live on Gathr right away.</p>
                    <Link to="/host/new" className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Add a venue</Link>
                  </div>
                )}
              </>
            )}

            {/* ---------- MESSAGES ---------- */}
            {tab === 'messages' && (
              <>
                <h1 className="text-[28px] font-extrabold my-2 mb-5">Messages</h1>
                <Suspense fallback={<p className="text-ink-soft">Loading messages…</p>}>
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
    <div className="flex justify-between items-center gap-[18px] border border-line rounded p-[18px] px-5 bg-white flex-col md:flex-row md:items-center">
      <div className="w-full">
        <div className="flex items-center gap-2.5 mb-2">
          <Link to={`/bookings/${b.id}`} className="font-bold text-base text-ink hover:text-brand">{b.venue_name}</Link>
          <span className={`text-[11px] font-bold uppercase tracking-[0.04em] py-1 px-2 rounded-full ${b.status === 'requested' ? 'bg-[#fef3e2] text-[#9a6700]' : b.status === 'confirmed' ? 'bg-[#e6f6ec] text-[#137a3c]' : 'bg-tint text-ink-soft'}`}>{b.status}</span>
        </div>
        <div className="flex flex-wrap gap-3.5 text-ink-soft text-[13.5px]">
          <span className="inline-flex items-center gap-1"><CalendarCheck size={15} className="text-ink-faint" /> <span className="font-mono">{fmtDate(b.event_date)}</span></span>
          {b.event_type && <span className="inline-flex items-center gap-1"><MapPin size={15} className="text-ink-faint" /> {b.event_type}</span>}
          <span className="inline-flex items-center gap-1"><Clock size={15} className="text-ink-faint" /> <span className="font-mono">{b.hours}</span> hrs</span>
          {b.guests && <span className="inline-flex items-center gap-1"><Users size={15} className="text-ink-faint" /> <span className="font-mono">{b.guests}</span> guests</span>}
          <span><b className="font-mono text-ink">{peso(b.total_php)}</b></span>
        </div>
        {b.note && <div className="mt-2 text-[13.5px] text-ink-soft flex gap-1.5 items-start"><StickyNote size={15} className="text-brand shrink-0 mt-0.5" /> <span>{b.note}</span></div>}
      </div>
      {b.status === 'requested' && (
        <div className="flex flex-row gap-2 w-full md:w-auto justify-end">
          <button className="inline-flex items-center gap-1 bg-brand text-white font-semibold text-[13px] py-[9px] px-3.5 rounded-[10px] transition-[filter] duration-150 hover:brightness-[1.06]" onClick={() => onStatus(b.id, 'confirmed')}><Check size={15} /> Confirm</button>
          <button className="inline-flex items-center gap-1 bg-white text-ink-soft border border-line-strong font-semibold text-[13px] py-[9px] px-3.5 rounded-[10px] transition-colors duration-150 hover:bg-tint" onClick={() => onStatus(b.id, 'cancelled')}><X size={15} /> Decline</button>
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
      <div className="flex items-center justify-between my-2 mb-[18px] flex-wrap gap-3">
        <h1 className="text-[28px] font-extrabold m-0">{MONTHS[m]} {year}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(new Date(year, m - 1, 1))} aria-label="Previous month" className="w-[38px] h-[38px] border border-line-strong rounded-[10px] grid place-items-center text-ink transition-colors duration-150 hover:bg-tint"><ChevronLeft size={18} /></button>
          <button onClick={() => setMonth(new Date())} className="w-auto px-4 font-semibold text-sm py-2 px-4 rounded-[10px] border border-line-strong bg-white transition-colors duration-150 hover:bg-tint">Today</button>
          <button onClick={() => setMonth(new Date(year, m + 1, 1))} aria-label="Next month" className="w-[38px] h-[38px] border border-line-strong rounded-[10px] grid place-items-center text-ink transition-colors duration-150 hover:bg-tint"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border border-line rounded overflow-hidden bg-line gap-px">
        {DOW.map((d) => <div key={d} className="bg-white p-2.5 text-center text-xs font-bold text-ink-soft uppercase tracking-[0.04em]">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div className="bg-[#fcfbfd] min-h-[104px] p-2" key={'e' + i} />
          const ds = toYMD(new Date(year, m, d))
          const items = byDate[ds] || []
          return (
            <div className={`bg-white min-h-[104px] p-2 flex flex-col gap-1 ${ds === todayStr ? 'bg-tint' : ''}`} key={ds}>
              <span className={`text-[13px] font-semibold w-6 h-6 grid place-items-center rounded-full ${ds === todayStr ? 'bg-brand text-white' : ''}`}>{d}</span>
              {items.slice(0, 3).map((r) => (
                <Link to={`/venue/${r.venue_id}`} key={r.id} className={`text-[11px] font-semibold py-[3px] px-[7px] rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-white ${r.status === 'requested' ? 'bg-[#e0a32e]' : 'bg-brand'}`} title={`${r.venue_name} · ${r.status}`}>
                  {r.venue_name}
                </Link>
              ))}
              {items.length > 3 && <span className="text-[11px] text-ink-soft pl-0.5">+{items.length - 3} more</span>}
            </div>
          )
        })}
      </div>
      <div className="flex gap-5 mt-3.5 text-[13px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block bg-[#e0a32e]" /> Requested</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block bg-brand" /> Confirmed</span>
      </div>
    </>
  )
}
