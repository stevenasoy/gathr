import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, ChevronLeft, MapPin, Users, Clock, CheckCircle2, ShieldCheck, Share, Heart, MessageSquare } from 'lucide-react'
import Footer from '../components/Footer'
import VenueCard from '../components/VenueCard'
import { Stars } from '../components/Stars'
import { amenityIcon } from '../lib/icons'
import { usePageTitle } from '../lib/title'
import { CATEGORIES } from '../data/categories'
import { useSaved } from '../context/SavedContext'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { createBooking } from '../lib/bookings'
import { unitWord } from '../lib/venues'
import { getOrCreateConversation } from '../lib/conversations'
import { listReviews } from '../lib/reviews'
import { peso, todayYMD } from '../lib/format'
import { srcSet, withWidth, gallerySizes } from '../lib/images'
import type { Review, PriceUnit } from '../types'

// Compute once at module scope so the date boundary doesn't recompute on every
// keystroke/render.
const todayStr = todayYMD()

const REVIEWS = [
  { name: 'Andrea L.', when: 'March 2026', text: 'Booked it for our company anniversary. Coordination was effortless and the space photographed beautifully.' },
  { name: 'Marco R.', when: 'February 2026', text: 'The host was responsive and flexible with our timeline. Guests kept asking how we found the place.' },
  { name: 'Joy M.', when: 'January 2026', text: 'Exactly as pictured. Setup was quick and the lighting at night was perfect for our program.' },
  { name: 'Karl D.', when: 'December 2025', text: 'Great value for the capacity. Parking made it easy for our older guests. Would book again.' },
]

export default function Venue() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { findVenue, venues, loading: venuesLoading } = useVenues()
  const venue = id ? findVenue(id) : undefined
  const { isSaved, toggle } = useSaved()
  const { user } = useAuth()
  const [hours, setHours] = useState(4)
  const [guests, setGuests] = useState('')
  const [date, setDate] = useState('')
  const [eventType, setEventType] = useState('')
  const [note, setNote] = useState('')
  const [requested, setRequested] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [shareToast, setShareToast] = useState(false)
  const [realReviews, setRealReviews] = useState<Review[]>([])
  const saved = venue ? isSaved(venue.id) : false
  usePageTitle(venue ? venue.name : 'Venue')

  // Real guest reviews (from completed bookings). Seed venues keep their
  // sample reviews; a real review always wins over samples.
  useEffect(() => {
    let on = true
    if (id) {
      listReviews(id)
        .then(({ data }) => { if (on) setRealReviews(data || []) })
        .catch((e) => { console.error('reviews load failed', e); if (on) setRealReviews([]) })
    }
    return () => { on = false }
  }, [id])
  const realCount = realReviews.length
  const realAvg = realCount ? Math.round((realReviews.reduce((s, r) => s + r.rating, 0) / realCount) * 100) / 100 : null

  // Per-head / per-event venues can include a set duration; prefill it.
  useEffect(() => {
    if (venue && venue.priceUnit && venue.priceUnit !== 'hour' && venue.includedHours) setHours(venue.includedHours)
  }, [venue?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: venue?.name, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2200)
      }
    } catch { /* user cancelled share / clipboard blocked — no false toast */ }
  }

  const onSave = () => {
    if (venue) toggle(venue.id)
  }

  const onMessage = async () => {
    if (!user) { navigate('/signin', { state: { from: `/venue/${venue!.id}` } }); return }
    try {
      const { data, error } = await getOrCreateConversation(venue!.id, venue!.name, user.id)
      if (error || !data) { setBookingError('Could not start a conversation. Please try again.'); return }
      navigate(`/messages?c=${data.id}`)
    } catch (e) {
      console.error('start conversation failed', e)
      setBookingError('Could not start a conversation. Please try again.')
    }
  }

  const onRequest = async () => {
    if (!user) {
      navigate('/signin', { state: { from: `/venue/${venue!.id}` } })
      return
    }
    setBookingError('')
    if (!date) { setBookingError('Pick a date for your event.'); return }
    if (date < todayStr) { setBookingError('Choose a date in the future.'); return }
    const guestCount = guests ? Number(guests) : null
    if (guestCount && guestCount > venue!.capacity) {
      setBookingError(`This space holds up to ${venue!.capacity} guests.`); return
    }
    if (unit === 'head' && !guestCount) {
      setBookingError('This venue is priced per head, so add your guest count.'); return
    }
    try {
      setBooking(true)
      const { error } = await createBooking({
        user_id: user.id,
        venue_id: venue!.id,
        venue_name: venue!.name,
        event_type: eventType || null,
        event_date: date,
        hours,
        guests: guestCount,
        total_php: total,
        note: note.trim() || null,
        status: 'requested',
      })
      if (error) { setBookingError(error.message); return }
      setRequested(true)
    } catch (e) {
      console.error('create booking failed', e)
      setBookingError('Could not send your request. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  // Derived data memoized up front so hooks run unconditionally before any
  // early return. When venue is not loaded yet, the arrays are empty.
  const ownListing = !!user && venue?.ownerId === user.id
  const venueId = venue?.id ?? ''
  const venueTypes = venue?.types ?? []
  const typeLabels = useMemo(
    () => venueTypes.map((t) => CATEGORIES.find((c) => c.id === t)?.label).filter(Boolean),
    [venueTypes],
  )
  const related = useMemo(
    () => venues
      .filter((v) => {
        if (v.id === venueId) return false
        if (ownListing && user) return v.ownerId === user.id
        return v.types.some((t) => venueTypes.includes(t))
      })
      .slice(0, 4),
    [venues, venueId, ownListing, user, venueTypes],
  )

  if (!venue) {
    return (
      <div className="wrap empty" style={{ paddingTop: 80 }}>
        {venuesLoading ? (
          <h3>Loading venue…</h3>
        ) : (
          <>
            <h3>Venue not found</h3>
            <Link to="/search" className="btn-clear">Back to all venues</Link>
          </>
        )}
      </div>
    )
  }

  const unit: PriceUnit = venue.priceUnit || 'hour'
  const unitW = unitWord(unit)
  const lockedDuration = unit !== 'hour' && !!venue.includedHours
  const guestsNum = Number(guests) || 0
  const qty = unit === 'hour' ? hours : unit === 'head' ? guestsNum : 1
  const subtotal = venue.pricePerHour * qty
  const serviceFee = Math.round(subtotal * 0.1)
  const total: number = subtotal + serviceFee
  // Display rating: real reviews first, then seed sample values.
  const shownRating = realCount ? realAvg : venue.rating
  const shownCount = realCount || venue.reviews
  const hasReviews = shownCount > 0
  const relatedTitle = ownListing ? 'Your other listings' : 'Similar venues'

  return (
    <>
      <main className="wrap detail">
        {ownListing
          ? <Link to="/host/dashboard?tab=listings" className="back-link"><ChevronLeft size={18} /> Your listings</Link>
          : <Link to="/search" className="back-link"><ChevronLeft size={18} /> All venues</Link>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="detail-title">{venue.name}</h1>
            <div className="detail-meta">
              {hasReviews ? (
                <>
                  <b><Star /> {shownRating}</b>
                  <span>({shownCount} review{shownCount > 1 ? 's' : ''})</span>
                </>
              ) : (
                <b>New on Gathr</b>
              )}
              <span className="dot">·</span>
              <b style={{ color: 'var(--ink)' }}><MapPin size={15} style={{ color: 'var(--ink-soft)' }} /> {venue.area ? `${venue.area}, ` : ''}{venue.city}</b>
              <span className="dot">·</span>
              <span>{typeLabels.join(' · ')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
            <button onClick={onShare} className="host-link" style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><Share size={16} /> Share</button>
            <button onClick={onSave} className="host-link" style={{ display: 'inline-flex', gap: 7, alignItems: 'center', color: saved ? 'var(--brand-2)' : undefined }}>
              <Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
            </button>
            {shareToast && <span className="toast">Link copied</span>}
          </div>
        </div>

        <div className="gallery">
          {venue.images.slice(0, 5).map((src, i) => (
            <div className={'g-img' + (i === 0 ? ' g-main' : '')} key={i} style={{ aspectRatio: '3/2' }}>
              <img
                src={withWidth(src, i === 0 ? 1200 : 600)}
                alt={`${venue.name} ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                width={i === 0 ? 1200 : 600}
                height={i === 0 ? 800 : 400}
                sizes={i === 0 ? gallerySizes : '(max-width: 1024px) 50vw, 20vw'}
                srcSet={srcSet(src, i === 0 ? [400, 800, 1200] : [400, 600])}
                fetchPriority={i === 0 ? 'high' : undefined}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>

        <div className="detail-body">
          <div>
            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>Hosted by {venue.host.name}</h2>
                  <span style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
                    {venue.host.type === 'business' ? 'Business host' : 'Individual host'} · Since {venue.host.since}{venue.host.superhost ? ' · Superhost' : ''}
                  </span>
                </div>
                <div className="host-av">{venue.host.name[0]}</div>
              </div>
              <div className="feat-row">
                <div className="feat"><Users /><b>{venue.capacity}</b><span>Max guests</span></div>
                <div className="feat"><Clock /><b>{peso(venue.pricePerHour)}</b><span>Per {unitW}</span></div>
                <div className="feat"><Star /><b>{hasReviews ? shownRating : 'New'}</b><span>{hasReviews ? `${shownCount} review${shownCount > 1 ? 's' : ''}` : 'No reviews yet'}</span></div>
              </div>
              <p className="detail-lead">{venue.blurb}</p>
              <p className="detail-lead" style={{ marginTop: 14 }}>{venue.host.name}'s team is on-site the day of your event, so setup, timing, and turnover are handled while you focus on your guests.</p>
            </div>

            <div className="detail-section">
              <h2>What this space offers</h2>
              <div className="amenity-grid">
                {venue.amenities.map((a) => {
                  const Icon = amenityIcon(a)
                  return <div className="item" key={a}><Icon strokeWidth={1.7} /> {a}</div>
                })}
              </div>
            </div>

            <div className="detail-section">
              {realCount > 0 ? (
                <>
                  <h2><Star size={18} style={{ color: 'var(--gold)', fill: 'var(--gold)', verticalAlign: '-3px' }} /> {realAvg} · {realCount} review{realCount > 1 ? 's' : ''}</h2>
                  <div className="reviews-grid">
                    {realReviews.map((r) => (
                      <div className="review" key={r.id}>
                        <div className="review-head">
                          <div className="review-av">{(r.author_name || 'G')[0].toUpperCase()}</div>
                          <div>
                            <b>{r.author_name}</b>
                            <div className="when">{new Date(r.created_at).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</div>
                          </div>
                          <Stars rating={r.rating} />
                        </div>
                        {r.body && <p>{r.body}</p>}
                      </div>
                    ))}
                  </div>
                </>
              ) : hasReviews ? (
                <>
                  <h2><Star size={18} style={{ color: 'var(--gold)', fill: 'var(--gold)', verticalAlign: '-3px' }} /> {shownRating} · {shownCount} reviews</h2>
                  <p className="detail-lead" style={{ fontSize: 14, marginBottom: 18 }}>Sample reviews shown for this preview. Real guest reviews appear here once a venue has hosted events.</p>
                  <div className="reviews-grid">
                    {REVIEWS.map((r) => (
                      <div className="review" key={r.name}>
                        <div className="review-head">
                          <div className="review-av">{r.name[0]}</div>
                          <div><b>{r.name}</b><div className="when">{r.when}</div></div>
                        </div>
                        <p>{r.text}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2>Reviews</h2>
                  <p className="detail-lead">No reviews yet. This is a new listing on Gathr, be one of the first to book it.</p>
                </>
              )}
            </div>
          </div>

          {/* Booking card */}
          <aside>
            <div className="booking">
              <div className="booking-price">
                <b>{peso(venue.pricePerHour)}</b><span>/ {unitW}{unit !== 'hour' && venue.includedHours ? ` · ${venue.includedHours} hrs` : ''}</span>
              </div>

              <div className="booking-grid">
                <div className="booking-row2">
                  <div className="booking-field">
                    <label>Date</label>
                    <input type="date" min={todayStr} value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="booking-field">
                    <label>Event</label>
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                      <option value="">Select</option>
                      {typeLabels.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="booking-row2">
                  <div className="booking-field">
                    <label>{unit === 'hour' ? 'Hours' : lockedDuration ? 'Duration · set by host' : 'Duration (hrs)'}</label>
                    <input type="number" min="1" max="24" value={hours} disabled={lockedDuration}
                      onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))}
                      style={lockedDuration ? { color: 'var(--ink-soft)', cursor: 'not-allowed' } : undefined} />
                  </div>
                  <div className="booking-field">
                    <label>Guests</label>
                    <input type="number" min="1" max={venue.capacity} placeholder={`Max ${venue.capacity}`} value={guests} onChange={(e) => setGuests(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="booking-note-field">
                <label>Special requests <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(optional)</span></label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
                  placeholder="Anything the venue should know in advance — setup time, layout, catering, parking…" />
              </div>

              <button className="btn-primary" onClick={onRequest} disabled={booking || requested}>
                {requested ? 'Request sent' : booking ? 'Sending…' : user ? 'Request to book' : 'Sign in to book'}
              </button>
              <div className="booking-note">No charge until {venue.host.name} confirms your date</div>

              {bookingError && <div className="form-error" style={{ marginTop: 12 }}>{bookingError}</div>}

              <div className="booking-breakdown">
                <div className="line"><span>{unit === 'event' ? 'Venue (flat rate)' : `${peso(venue.pricePerHour)} × ${qty} ${unit === 'head' ? 'guests' : 'hours'}`}</span><span>{peso(subtotal)}</span></div>
                <div className="line"><span>Service fee</span><span>{peso(serviceFee)}</span></div>
                <div className="total"><span>Total</span><span>{peso(total)}</span></div>
                {unit !== 'hour' && (
                  <p className="dash-muted" style={{ fontSize: 12, marginTop: 8 }}>
                    {unit === 'head' ? 'Priced per head' : 'Flat rate'}{venue.includedHours ? ` · covers ${venue.includedHours} hours` : ''} — duration doesn't change the total.
                  </p>
                )}
              </div>

              {requested && (
                <div className="booking-confirm">
                  <CheckCircle2 size={18} />
                  <span>Request sent to {venue.host.name}. They typically reply within an hour. Track it under <Link to="/bookings" style={{ color: 'var(--brand)', fontWeight: 600 }}>your bookings</Link>.</span>
                </div>
              )}
            </div>
            {!ownListing && (
              <button className="btn-ghost" onClick={onMessage} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <MessageSquare size={16} /> Message the Host
              </button>
            )}
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', justifyContent: 'center', marginTop: 14, color: 'var(--ink-soft)', fontSize: 13 }}>
              <ShieldCheck size={16} style={{ color: 'var(--brand)' }} /> No payment until {venue.host.name} confirms your date
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="detail-section">
            <h2 style={{ marginBottom: 18 }}>{relatedTitle}</h2>
            <div className="grid">
              {related.map((v) => <VenueCard key={v.id} venue={v} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
