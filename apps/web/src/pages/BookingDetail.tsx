import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CalendarCheck, Clock, Users, MapPin, StickyNote, MessageSquare, Check, X, ExternalLink } from 'lucide-react'
import Footer from '../components/Footer'
import { Stars, StarPicker } from '../components/Stars'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { fetchBooking, cancelBooking, setBookingStatus } from '../lib/bookings'
import { fetchVenue } from '../lib/venues'
import { getReviewForBooking, createReview } from '../lib/reviews'
import { peso, fmtDate, fmtWhen, todayYMD } from '../lib/format'
import type { Venue, Review } from '../types'
import type { BookingRow } from '../types/db'

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, displayName, loading: authLoading } = useAuth()
  const { findVenue } = useVenues()
  const [b, setB] = useState<BookingRow | null>(null)
  const [fetchedVenue, setFetchedVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Review state (Gatherer side, completed bookings only)
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [rating, setRating] = useState(0)
  const [reviewBody, setReviewBody] = useState('')
  const [reviewErr, setReviewErr] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (authLoading) return
      if (!user) { setLoading(false); return }
      try {
        const { data, error } = await fetchBooking(id!)
        if (!active) return
        if (error) throw error
        if (!data) { setNotFound(true); return }
        setB(data)
      } catch (e) {
        console.error('booking load failed', e)
        if (active) setLoadError('Could not load this booking. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id, user, authLoading])

  // Resolve the venue's photos: from the catalog if available, else fetch it
  // (covers a Host's own unlisted venue).
  const catalogVenue = b ? findVenue(b.venue_id) : null
  useEffect(() => {
    if (b && !catalogVenue && !fetchedVenue) {
      fetchVenue(b.venue_id)
        .then((v) => setFetchedVenue(v))
        .catch((e) => console.error('venue fetch failed', e))
    }
  }, [b, catalogVenue, fetchedVenue])
  const images = (catalogVenue?.images?.length ? catalogVenue.images : fetchedVenue?.images) || []

  // A completed booking (confirmed + past date) can be reviewed once.
  const completed = !!b && b.status === 'confirmed' && b.event_date && b.event_date <= todayYMD()
  useEffect(() => {
    if (b && user && b.user_id === user.id && completed) {
      getReviewForBooking(b.id)
        .then(setMyReview)
        .catch((e) => console.error('review lookup failed', e))
    }
  }, [b, user, completed])

  const submitReview = async () => {
    if (!b || !user) return
    setReviewErr('')
    if (!rating) { setReviewErr('Tap a star rating first.'); return }
    try {
      setReviewBusy(true)
      const { data, error: e } = await createReview({
        booking_id: b.id,
        venue_id: b.venue_id,
        user_id: user.id,
        author_name: displayName || 'Gatherer',
        rating,
        body: reviewBody.trim(),
      })
      if (e) { setReviewErr('Could not save your review. Please try again.'); return }
      setMyReview(data)
    } catch (e) {
      console.error('review submit failed', e)
      setReviewErr('Could not save your review. Please try again.')
    } finally {
      setReviewBusy(false)
    }
  }

  if (authLoading || loading) {
    return <main className="auth-page"><p style={{ color: 'var(--ink-soft)' }}>Loading…</p></main>
  }
  if (!user) {
    return (
      <>
        <main className="auth-page"><div className="form-card">
          <h1>Booking</h1>
          <p className="form-sub">Sign in to view this booking.</p>
          <Link to="/signin" state={{ from: `/bookings/${id}` }} className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>Sign in</Link>
        </div></main>
        <Footer />
      </>
    )
  }
  if (loadError) {
    return (
      <>
        <main className="wrap empty" style={{ paddingTop: 80 }}>
          <h3>{loadError}</h3>
          <button className="btn-primary" style={{ width: 'auto', padding: '12px 22px', marginTop: 12 }} onClick={() => location.reload()}>Retry</button>
        </main>
        <Footer />
      </>
    )
  }
  if (notFound || !b) {
    return (
      <>
        <main className="wrap empty" style={{ paddingTop: 80 }}>
          <h3>Booking not found</h3>
          <Link to="/bookings" className="btn-clear">Back to your bookings</Link>
        </main>
        <Footer />
      </>
    )
  }

  // RLS only returns bookings you're party to, so: your own booking => gatherer, else => host.
  const isGatherer = b.user_id === user.id
  const backTo = isGatherer ? '/bookings' : '/host/dashboard?tab=today'
  // Gatherer messages from their own inbox; Host messages from the host inbox (dashboard tab).
  const messageTo = isGatherer ? `/messages?b=${b.id}` : `/host/dashboard?tab=messages&b=${b.id}`

  const onCancel = async () => {
    if (!window.confirm('Cancel this request? This cannot be undone.')) return
    try {
      setBusy(true)
      const { error: e } = await cancelBooking(b.id)
      if (e) { setError('Could not cancel. Please try again.'); return }
      navigate(backTo)
    } catch (e) {
      console.error('cancel failed', e)
      setError('Could not cancel. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  const onStatus = async (status: string) => {
    setError('')
    try {
      setBusy(true)
      const { error: e } = await setBookingStatus(b.id, status)
      if (e) { setError(status === 'confirmed' ? 'Could not confirm — another booking may already be confirmed for that date.' : 'Could not update. Try again.'); return }
      setB({ ...b, status })
    } catch (e) {
      console.error('status update failed', e)
      setError('Could not update. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <main className="wrap" style={{ maxWidth: 720, paddingTop: 26, paddingBottom: 40 }}>
        <Link to={backTo} className="back-link"><ChevronLeft size={18} /> {isGatherer ? 'Your bookings' : 'Dashboard'}</Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>{b.venue_name}</h1>
            <p style={{ color: 'var(--ink-soft)', marginTop: 4 }}>{isGatherer ? 'Your booking request' : 'Booking request for your venue'}</p>
          </div>
          <span className={'status-pill status-' + b.status} style={{ fontSize: 13 }}>{b.status}</span>
        </div>

        {images.length > 0 && (
          <Link to={`/venue/${b.venue_id}`} className="booking-photos" aria-label="View venue">
            <div className="booking-photo-main">
              <img src={images[0]} alt={b.venue_name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </div>
            {images.length > 1 && (
              <div className="booking-photo-thumbs">
                {images.slice(1, 4).map((src, i) => (
                  <img key={i} src={src} alt={`${b.venue_name} ${i + 2}`} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ))}
              </div>
            )}
          </Link>
        )}

        <div className="detail-card" style={{ marginTop: 22 }}>
          <div className="detail-line"><CalendarCheck size={18} /><span><b>Date</b><br />{fmtDate(b.event_date, 'long')}</span></div>
          {b.event_type && <div className="detail-line"><MapPin size={18} /><span><b>Event</b><br />{b.event_type}</span></div>}
          <div className="detail-line"><Clock size={18} /><span><b>Duration</b><br />{b.hours} hours</span></div>
          {b.guests != null && <div className="detail-line"><Users size={18} /><span><b>Guests</b><br />{b.guests}</span></div>}
          {b.note && <div className="detail-line"><StickyNote size={18} /><span><b>Special requests</b><br />{b.note}</span></div>}
        </div>

        <div className="booking-breakdown" style={{ marginTop: 20, maxWidth: 360 }}>
          <div className="total"><span>Total</span><span>{peso(b.total_php)}</span></div>
          <p className="dash-muted" style={{ fontSize: 12, marginTop: 6 }}>Includes Gathr's 10% service fee. {isGatherer ? 'No charge until the Host confirms.' : ''}</p>
        </div>

        <p className="dash-muted" style={{ fontSize: 13, marginTop: 14 }}>Requested {fmtWhen(b.created_at)}</p>

        {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}

        <div className="cta-row" style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to={messageTo} className="btn-ghost" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={16} /> Message {isGatherer ? 'the Host' : 'the Gatherer'}
          </Link>
          <Link to={`/venue/${b.venue_id}`} className="btn-ghost" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ExternalLink size={16} /> View venue
          </Link>

          {/* Gatherer can cancel only while pending */}
          {isGatherer && b.status === 'requested' && (
            <button onClick={onCancel} disabled={busy} className="btn-ghost" style={{ width: 'auto', color: '#a01230', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <X size={16} /> Cancel request
            </button>
          )}
          {/* Host confirms / declines while pending */}
          {!isGatherer && b.status === 'requested' && (
            <>
              <button onClick={() => onStatus('confirmed')} disabled={busy} className="btn-primary" style={{ width: 'auto', padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Check size={16} /> Confirm</button>
              <button onClick={() => onStatus('cancelled')} disabled={busy} className="btn-ghost" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7 }}><X size={16} /> Decline</button>
            </>
          )}
        </div>

        {/* Review block: Gatherer side, after the event happened */}
        {isGatherer && completed && (
          <div className="review-block">
            {myReview ? (
              <>
                <h2>Your review</h2>
                <div className="review your-review">
                  <div className="review-head">
                    <div className="review-av">{(myReview.author_name || 'G')[0].toUpperCase()}</div>
                    <div>
                      <b>{myReview.author_name}</b>
                      <div className="when">{new Date(myReview.created_at).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</div>
                    </div>
                    <Stars rating={myReview.rating} />
                  </div>
                  {myReview.body && <p>{myReview.body}</p>}
                </div>
                <p className="dash-muted" style={{ fontSize: 13, marginTop: 10 }}>
                  Your review is live on <Link to={`/venue/${b.venue_id}`} style={{ color: 'var(--brand)', fontWeight: 600 }}>the venue's page</Link>.
                </p>
              </>
            ) : (
              <>
                <h2>How was {b.venue_name}?</h2>
                <p className="dash-muted" style={{ marginTop: 4, marginBottom: 14 }}>Your review helps other Gatherers pick the right space.</p>
                <StarPicker value={rating} onChange={setRating} />
                <textarea
                  className="review-input"
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  maxLength={600}
                  placeholder="What worked, what didn't, what should the next Gatherer know?"
                />
                {reviewErr && <div className="form-error" style={{ marginTop: 10 }}>{reviewErr}</div>}
                <button className="btn-primary" onClick={submitReview} disabled={reviewBusy} style={{ width: 'auto', padding: '12px 22px', marginTop: 12 }}>
                  {reviewBusy ? 'Posting…' : 'Post review'}
                </button>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
