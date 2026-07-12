import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CalendarCheck, Clock, Users, MapPin, StickyNote, MessageSquare, Check, X, ExternalLink } from 'lucide-react'
import Footer from '../components/Footer'
import { BookingDetailSkeleton } from '../components/Skeleton'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Stars, StarPicker } from '../components/Stars'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { fetchBooking, cancelBooking, setBookingStatus } from '../lib/bookings'
import { fetchVenue } from '../lib/venues'
import { getReviewForBooking, createReview } from '../lib/reviews'
import { peso, fmtDate, fmtWhen, todayYMD } from '../lib/format'
import { srcSet, withWidth, gallerySizes } from '../lib/images'
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
  const [showCancel, setShowCancel] = useState(false)
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
    let active = true
    if (b && !catalogVenue && !fetchedVenue) {
      fetchVenue(b.venue_id)
        .then((v) => { if (active) setFetchedVenue(v) })
        .catch((e) => console.error('venue fetch failed', e))
    }
    return () => { active = false }
  }, [b, catalogVenue, fetchedVenue])
  const images = (catalogVenue?.images?.length ? catalogVenue.images : fetchedVenue?.images) || []

  // A completed booking (confirmed + past date) can be reviewed once.
  const completed = !!b && b.status === 'confirmed' && b.event_date && b.event_date <= todayYMD()
  useEffect(() => {
    let active = true
    if (b && user && b.user_id === user.id && completed) {
      getReviewForBooking(b.id)
        .then((r) => { if (active) setMyReview(r) })
        .catch((e) => console.error('review lookup failed', e))
    }
    return () => { active = false }
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
    return (
      <>
        <BookingDetailSkeleton />
        <Footer />
      </>
    )
  }
  if (!user) {
    return (
      <>
        <main className="min-h-[70vh] grid place-items-center py-[60px] px-5">
          <div className="max-w-[460px] mx-auto p-8 border border-line rounded-lg bg-white shadow-card">
            <h1 className="text-[26px] font-extrabold mb-2 text-center">Booking</h1>
            <p className="text-center text-ink-soft text-[14.5px] mb-6">Sign in to view this booking.</p>
            <Link to="/signin" state={{ from: `/bookings/${id}` }} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ display: 'block', textAlign: 'center' }}>Sign in</Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }
  if (loadError) {
    return (
      <>
        <main className="max-w-wrap mx-auto px-10 text-center py-20 px-5 text-ink-soft" style={{ paddingTop: 80 }}>
          <h3 className="text-xl text-ink mb-2">{loadError}</h3>
          <button className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '12px 22px', marginTop: 12 }} onClick={() => location.reload()}>Retry</button>
        </main>
        <Footer />
      </>
    )
  }
  if (notFound || !b) {
    return (
      <>
        <main className="max-w-wrap mx-auto px-10 text-center py-20 px-5 text-ink-soft" style={{ paddingTop: 80 }}>
          <h3 className="text-xl text-ink mb-2">Booking not found</h3>
          <Link to="/bookings" className="font-semibold text-[13px] text-brand hover:underline">Back to your bookings</Link>
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
      <main className="max-w-wrap mx-auto px-10" style={{ maxWidth: 720, paddingTop: 26, paddingBottom: 40 }}>
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-ink-soft font-semibold text-sm mb-4 hover:text-ink"><ChevronLeft size={18} /> {isGatherer ? 'Your bookings' : 'Dashboard'}</Link>

        <div className="flex justify-between items-start gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-[28px] font-extrabold">{b.venue_name}</h1>
            <p className="text-ink-soft mt-1">{isGatherer ? 'Your booking request' : 'Booking request for your venue'}</p>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-[0.04em] py-1 px-2 rounded-full ${b.status === 'requested' ? 'bg-[#fef3e2] text-[#9a6700]' : b.status === 'confirmed' ? 'bg-[#e6f6ec] text-[#137a3c]' : 'bg-tint text-ink-soft'}`} style={{ fontSize: 13 }}>{b.status}</span>
        </div>

        {images.length > 0 && (
          <Link to={`/venue/${b.venue_id}`} className="block mt-5" aria-label="View venue">
            <div className="aspect-[2.2/1] rounded-lg overflow-hidden bg-gradient" style={{ aspectRatio: '3/2' }}>
              <img
                src={withWidth(images[0], 1200)}
                alt={b.venue_name}
                loading="lazy"
                decoding="async"
                width={1200}
                height={800}
                sizes={gallerySizes}
                srcSet={srcSet(images[0], [400, 800, 1200])}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
                className="w-full h-full object-cover transition-[filter] duration-150 hover:brightness-95"
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {images.slice(1, 4).map((src, i) => (
                  <div key={i} style={{ aspectRatio: '3/2' }}>
                    <img
                      src={withWidth(src, 400)}
                      alt={`${b.venue_name} ${i + 2}`}
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={267}
                      srcSet={srcSet(src, [400, 600])}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                      className="w-full h-full object-cover rounded-[10px] bg-tint"
                    />
                  </div>
                ))}
              </div>
            )}
          </Link>
        )}

        <div className="border border-line rounded-lg bg-white mt-[22px]">
          <div className="flex gap-3 py-4 px-[18px] border-b border-line text-[14.5px]"><CalendarCheck size={18} className="text-brand shrink-0 mt-0.5" /><span><b className="text-xs uppercase tracking-[0.04em] text-ink-soft block">Date</b><span className="font-mono">{fmtDate(b.event_date, 'long')}</span></span></div>
          {b.event_type && <div className="flex gap-3 py-4 px-[18px] border-b border-line text-[14.5px]"><MapPin size={18} className="text-brand shrink-0 mt-0.5" /><span><b className="text-xs uppercase tracking-[0.04em] text-ink-soft block">Event</b>{b.event_type}</span></div>}
          <div className="flex gap-3 py-4 px-[18px] border-b border-line text-[14.5px]"><Clock size={18} className="text-brand shrink-0 mt-0.5" /><span><b className="text-xs uppercase tracking-[0.04em] text-ink-soft block">Duration</b><span className="font-mono">{b.hours}</span> hours</span></div>
          {b.guests != null && <div className="flex gap-3 py-4 px-[18px] border-b border-line text-[14.5px]"><Users size={18} className="text-brand shrink-0 mt-0.5" /><span><b className="text-xs uppercase tracking-[0.04em] text-ink-soft block">Guests</b><span className="font-mono">{b.guests}</span></span></div>}
          {b.note && <div className="flex gap-3 py-4 px-[18px] text-[14.5px]"><StickyNote size={18} className="text-brand shrink-0 mt-0.5" /><span><b className="text-xs uppercase tracking-[0.04em] text-ink-soft block">Special requests</b>{b.note}</span></div>}
        </div>

        <div className="mt-5 text-sm max-w-[360px]">
          <div className="flex justify-between pt-3.5 mt-1.5 border-t border-line font-bold text-ink"><span>Total</span><span className="font-mono">{peso(b.total_php)}</span></div>
          <p className="text-ink-soft text-xs mt-1.5">Includes Gathr's 10% service fee. {isGatherer ? 'No charge until the Host confirms.' : ''}</p>
        </div>

        <p className="text-ink-soft text-[13px] mt-3.5">Requested <span className="font-mono">{fmtWhen(b.created_at)}</span></p>

        {error && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mt-3.5">{error}</div>}

        <div className="inline-flex gap-2.5 flex-wrap mt-[22px]">
          <Link to={messageTo} className="py-2 px-3.5 rounded-xl border border-line-strong bg-white font-semibold text-[15px] text-ink transition-colors duration-150 hover:bg-tint inline-flex items-center gap-2">
            <MessageSquare size={16} /> Message {isGatherer ? 'the Host' : 'the Gatherer'}
          </Link>
          <Link to={`/venue/${b.venue_id}`} className="py-2 px-3.5 rounded-xl border border-line-strong bg-white font-semibold text-[15px] text-ink transition-colors duration-150 hover:bg-tint inline-flex items-center gap-2">
            <ExternalLink size={16} /> View venue
          </Link>

          {/* Gatherer can cancel only while pending */}
          {isGatherer && b.status === 'requested' && (
            <button onClick={() => setShowCancel(true)} disabled={busy} className="py-2 px-3.5 rounded-xl border border-line-strong bg-white font-semibold text-[15px] transition-colors duration-150 hover:bg-tint inline-flex items-center gap-2" style={{ color: '#a01230' }}>
              <X size={16} /> Cancel request
            </button>
          )}
          {/* Host confirms / declines while pending */}
          {!isGatherer && b.status === 'requested' && (
            <>
              <button onClick={() => onStatus('confirmed')} disabled={busy} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed" style={{ width: 'auto', padding: '12px 20px', display: 'inline-flex' }}><Check size={16} /> Confirm</button>
              <button onClick={() => onStatus('cancelled')} disabled={busy} className="py-2 px-3.5 rounded-xl border border-line-strong bg-white font-semibold text-[15px] text-ink transition-colors duration-150 hover:bg-tint inline-flex items-center gap-2"><X size={16} /> Decline</button>
            </>
          )}
        </div>

        {/* Review block: Gatherer side, after the event happened */}
        {isGatherer && completed && (
          <div className="mt-[34px] pt-[26px] border-t border-line">
            {myReview ? (
              <>
                <h2 className="text-[21px] mb-1">Your review</h2>
                <div className="max-w-[560px] border border-line rounded-[14px] p-4 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-tint text-brand grid place-items-center font-bold">{(myReview.author_name || 'G')[0].toUpperCase()}</div>
                    <div>
                      <b>{myReview.author_name}</b>
                      <div className="text-ink-faint text-[13px]">{new Date(myReview.created_at).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</div>
                    </div>
                    <Stars rating={myReview.rating} />
                  </div>
                  {myReview.body && <p className="mt-2.5 text-ink-soft text-[14.5px]">{myReview.body}</p>}
                </div>
                <p className="text-ink-soft text-[13px] mt-2.5">
                  Your review is live on <Link to={`/venue/${b.venue_id}`} className="text-brand font-semibold">the venue's page</Link>.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-[21px] mb-1">How was {b.venue_name}?</h2>
                <p className="text-ink-soft mt-1 mb-3.5">Your review helps other Gatherers pick the right space.</p>
                <StarPicker value={rating} onChange={setRating} />
                <textarea
                  className="w-full max-w-[560px] min-h-[110px] mt-3.5 border border-line-strong rounded-xl p-3 font-[inherit] text-[14.5px] resize-y outline-2 outline-brand -outline-offset-1"
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  maxLength={600}
                  placeholder="What worked, what didn't, what should the next Gatherer know?"
                />
                {reviewErr && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mt-2.5">{reviewErr}</div>}
                <button className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed" onClick={submitReview} disabled={reviewBusy} style={{ width: 'auto', padding: '12px 22px', marginTop: 12 }}>
                  {reviewBusy ? 'Posting…' : 'Post review'}
                </button>
              </>
            )}
          </div>
        )}
      </main>
      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        onConfirm={async () => { setShowCancel(false); await onCancel() }}
        title="Cancel this request?"
        body={<>This will cancel your request for <b className="text-ink">{b.venue_name}</b>. This cannot be undone.</>}
        confirmLabel="Cancel request"
        destructive
      />
      <Footer />
    </>
  )
}
