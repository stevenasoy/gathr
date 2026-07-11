import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, MapPin, Users, Clock, X, StickyNote } from 'lucide-react'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { listBookings, cancelBooking } from '../lib/bookings'
import { peso, fmtDate } from '../lib/format'
import type { Booking } from '../types'

export default function Bookings() {
  const { user, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!user) { setLoading(false); return }
      try {
        setLoading(true)
        setError('')
        const { data, error } = await listBookings(user.id)
        if (error) throw error
        if (active) setRows(data || [])
      } catch (e) {
        console.error('bookings load failed', e)
        if (active) setError('Could not load your bookings. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user])

  const onCancel = async (id: string) => {
    if (!window.confirm('Cancel this request? This cannot be undone.')) return
    const prev = rows
    setRows((r) => r.filter((b) => b.id !== id))
    setCancelError('')
    try {
      const { error } = await cancelBooking(id)
      if (error) { setRows(prev); setCancelError('Could not cancel. Please try again.') }
    } catch (e) {
      console.error('cancel failed', e)
      setRows(prev)
      setCancelError('Could not cancel. Please try again.')
    }
  }

  // Gate: not signed in
  if (!authLoading && !user) {
    return (
      <>
        <main>
          <section className="page-hero">
            <div className="wrap">
              <span className="page-eyebrow">Your account</span>
              <h1>Your bookings</h1>
              <p>Sign in to see your venue requests and confirmed dates.</p>
            </div>
          </section>
          <div className="wrap page-body">
            <div className="empty-state">
              <CalendarCheck size={40} strokeWidth={1.5} />
              <h2>Sign in to view bookings</h2>
              <p>Your booking requests are tied to your account. Sign in to see them here.</p>
              <Link to="/signin" state={{ from: '/bookings' }} className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Sign in</Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">Your account</span>
            <h1>Your bookings</h1>
            <p>{rows.length ? `${rows.length} request${rows.length > 1 ? 's' : ''} on file.` : 'Trips, events, and confirmed dates will live here.'}</p>
          </div>
        </section>

        <div className="wrap page-body">
          {cancelError && <div className="form-error" style={{ marginBottom: 14 }}>{cancelError}</div>}
          {error ? (
            <div className="empty-state">
              <p>{error}</p>
              <button className="btn-primary" style={{ width: 'auto', padding: '12px 22px' }} onClick={() => location.reload()}>Retry</button>
            </div>
          ) : loading || authLoading ? (
            <div className="empty-state"><p>Loading your bookings…</p></div>
          ) : rows.length ? (
            <div className="booking-list">
              {rows.map((b) => (
                <div className="booking-row" key={b.id}>
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
                    </div>
                    {b.note && <div className="req-note"><StickyNote size={15} /> <span>{b.note}</span></div>}
                  </div>
                  <div className="booking-row-side">
                    <b>{peso(b.total_php)}</b>
                    {b.status === 'requested' ? (
                      <button className="btn-clear" onClick={() => onCancel(b.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <X size={14} /> Cancel
                      </button>
                    ) : b.status === 'confirmed' ? (
                      <span className="dash-muted" style={{ fontSize: 12 }}>Confirmed · message the venue to change</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <CalendarCheck size={40} strokeWidth={1.5} />
              <h2>No bookings yet</h2>
              <p>When you request a venue, your itinerary and status will show up here.</p>
              <Link to="/search" className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Find a venue</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
