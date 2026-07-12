import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, ChevronLeft, ChevronRight, MapPin, Users, Clock, CheckCircle2, ShieldCheck, Share, Heart, MessageSquare } from 'lucide-react'
import Footer from '../components/Footer'
import VenueCard from '../components/VenueCard'
import { HeroSkeleton } from '../components/Skeleton'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
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
  const [realReviews, setRealReviews] = useState<Review[]>([])
  const [lightbox, setLightbox] = useState<number | null>(null)
  const { toast } = useToast()
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
        toast('Link copied')
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
  const venueTypes = useMemo(() => venue?.types ?? [], [venue?.types])
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
    if (venuesLoading) return <HeroSkeleton />
    return (
      <div className="max-w-wrap mx-auto px-10 text-center py-20 px-5 text-ink-soft" style={{ paddingTop: 80 }}>
        <h3 className="text-xl text-ink mb-2">Venue not found</h3>
        <Link to="/search" className="font-semibold text-[13px] text-brand hover:underline">Back to all venues</Link>
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

  const galleryClass = `grid gap-2 rounded-lg overflow-hidden my-3 mb-7 bg-tint ${
    venue.images.length === 1 ? 'grid-cols-1 aspect-[2.4/1]' :
    venue.images.length === 2 ? 'grid-cols-2 aspect-[2.4/1]' :
    venue.images.length === 3 ? 'grid-cols-[2fr_1fr] grid-rows-2 aspect-[2.4/1]' :
    venue.images.length === 4 ? 'grid-cols-[2fr_1fr_1fr] grid-rows-[1.5fr_1fr] aspect-[2.4/1]' :
    'grid-cols-[2fr_1fr_1fr] grid-rows-2 aspect-[2.4/1]'
  }`

  return (
    <>
      <main className="max-w-wrap mx-auto px-10 pt-[26px]">
        {ownListing
          ? <Link to="/host/dashboard?tab=listings" className="inline-flex items-center gap-1.5 text-ink-soft font-semibold text-sm mb-4 hover:text-ink"><ChevronLeft size={18} /> Your listings</Link>
          : <Link to="/search" className="inline-flex items-center gap-1.5 text-ink-soft font-semibold text-sm mb-4 hover:text-ink"><ChevronLeft size={18} /> All venues</Link>}

        <div className="flex justify-between items-end gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-[30px] font-extrabold">{venue.name}</h1>
            <div className="flex items-center gap-2 flex-wrap my-2.5 mb-[18px] text-sm text-ink-soft">
              {hasReviews ? (
                <>
                  <b className="text-ink font-semibold inline-flex items-center gap-1"><Star className="w-[15px] h-[15px] text-gold fill-gold" /> {shownRating}</b>
                  <span>({shownCount} review{shownCount > 1 ? 's' : ''})</span>
                </>
              ) : (
                <b className="text-ink">New on Gathr</b>
              )}
              <span className="text-line-strong">·</span>
              <b className="text-ink font-semibold inline-flex items-center gap-1"><MapPin size={15} className="text-ink-soft" /> {venue.area ? `${venue.area}, ` : ''}{venue.city}</b>
              <span className="text-line-strong">·</span>
              <span>{typeLabels.join(' · ')}</span>
            </div>
          </div>
          <div className="flex gap-1.5 relative">
            <button onClick={onShare} className="py-2 px-3.5 rounded-xl border border-line-strong bg-white font-semibold text-[13.5px] text-ink transition-colors duration-150 hover:bg-tint inline-flex items-center gap-1.5"><Share size={16} /> Share</button>
            {venue?.isHostListing && (
            <button onClick={onSave} className={`py-2 px-3.5 rounded-xl border border-line-strong bg-white font-semibold text-[13.5px] transition-colors duration-150 hover:bg-tint inline-flex items-center gap-1.5 ${saved ? 'text-brand' : 'text-ink'}`}>
              <Heart size={16} fill={saved ? 'var(--brand)' : 'none'} /> {saved ? 'Saved' : 'Save'}
            </button>
            )}
          </div>
        </div>

        <div className={galleryClass}>
          {venue.images.slice(0, 5).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(i)}
              aria-label={`Open photo ${i + 1}`}
              className={`overflow-hidden p-0 border-0 bg-transparent block w-full h-full cursor-zoom-in ${i === 0 ? (venue.images.length <= 2 ? '' : 'row-span-2') : ''} ${venue.images.length === 4 && i === 1 ? 'col-span-2' : ''}`}
            >
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
                className="w-full h-full object-cover transition-[filter] duration-200 hover:brightness-[0.94]"
              />
            </button>
          ))}
        </div>

        <Modal
          open={lightbox !== null}
          onOpenChange={(o) => { if (!o) setLightbox(null) }}
          size="lg"
        >
          {lightbox !== null && venue.images[lightbox] && (
            <div className="relative -m-6">
              <img
                src={withWidth(venue.images[lightbox], 1600)}
                alt={`${venue.name} ${lightbox + 1}`}
                className="w-full max-h-[82vh] object-contain bg-ink rounded-lg"
              />
              {venue.images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => setLightbox((l) => (l === null ? l : (l + venue.images.length - 1) % venue.images.length))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur grid place-items-center text-ink hover:bg-white transition-colors shadow-card"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setLightbox((l) => (l === null ? l : (l + 1) % venue.images.length))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur grid place-items-center text-ink hover:bg-white transition-colors shadow-card"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>
          )}
        </Modal>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-[60px] py-[38px] items-start">
          <div>
            <div className="py-[26px] border-t border-line first:border-t-0 first:pt-0">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">Hosted by {venue.host.name}</h2>
                  <span className="text-ink-soft text-sm">
                    {venue.host.type === 'business' ? 'Business host' : 'Individual host'} · Since {venue.host.since}{venue.host.superhost ? ' · Superhost' : ''}
                  </span>
                </div>
                <div className="w-[52px] h-[52px] rounded-full bg-gradient text-white grid place-items-center font-bold text-[19px]">{venue.host.name[0]}</div>
              </div>
              <div className="flex gap-3.5 flex-wrap mb-[22px]">
                <div className="flex-1 min-w-[150px] border border-line rounded-lg p-4"><Users className="text-brand w-[22px] h-[22px] mb-2" /><b className="block text-[18px] font-bold font-mono">{venue.capacity}</b><span className="text-[13px] text-ink-soft">Max guests</span></div>
                <div className="flex-1 min-w-[150px] border border-line rounded-lg p-4"><Clock className="text-brand w-[22px] h-[22px] mb-2" /><b className="block text-[18px] font-bold font-mono">{peso(venue.pricePerHour)}</b><span className="text-[13px] text-ink-soft">Per {unitW}</span></div>
                <div className="flex-1 min-w-[150px] border border-line rounded-lg p-4"><Star className="text-brand w-[22px] h-[22px] mb-2" /><b className="block text-[18px] font-bold font-mono">{hasReviews ? shownRating : 'New'}</b><span className="text-[13px] text-ink-soft">{hasReviews ? `${shownCount} review${shownCount > 1 ? 's' : ''}` : 'No reviews yet'}</span></div>
              </div>
              <p className="text-ink-soft text-base leading-relaxed">{venue.blurb}</p>
              <p className="text-ink-soft text-base leading-relaxed mt-3.5">{venue.host.name}'s team is on-site the day of your event, so setup, timing, and turnover are handled while you focus on your guests.</p>
            </div>

            <div className="py-[26px] border-t border-line">
              <h2 className="text-xl font-bold mb-3.5">What this space offers</h2>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                {venue.amenities.map((a) => {
                  const Icon = amenityIcon(a)
                  return <div key={a} className="flex items-center gap-3 text-[15px]"><Icon strokeWidth={1.7} className="text-brand w-5 h-5 shrink-0" /> {a}</div>
                })}
              </div>
            </div>

            <div className="py-[26px] border-t border-line">
              {realCount > 0 ? (
                <>
                  <h2 className="text-xl font-bold mb-3.5"><Star size={18} className="text-gold fill-gold inline-block align-[-3px]" /> <span className="font-mono">{realAvg}</span> · {realCount} review{realCount > 1 ? 's' : ''}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-6">
                    {realReviews.map((r) => (
                      <div key={r.id}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-tint text-brand grid place-items-center font-bold">{(r.author_name || 'G')[0].toUpperCase()}</div>
                          <div>
                            <b className="text-[15px]">{r.author_name}</b>
                            <div className="text-ink-faint text-[13px]">{new Date(r.created_at).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</div>
                          </div>
                          <Stars rating={r.rating} />
                        </div>
                        {r.body && <p className="text-ink-soft text-[14.5px] mt-2">{r.body}</p>}
                      </div>
                    ))}
                  </div>
                </>
              ) : hasReviews ? (
                <>
                  <h2 className="text-xl font-bold mb-3.5"><Star size={18} className="text-gold fill-gold inline-block align-[-3px]" /> <span className="font-mono">{shownRating}</span> · {shownCount} reviews</h2>
                  <p className="text-ink-soft text-sm mb-[18px]">Sample reviews shown for this preview. Real guest reviews appear here once a venue has hosted events.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-6">
                    {REVIEWS.map((r) => (
                      <div key={r.name}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-tint text-brand grid place-items-center font-bold">{r.name[0]}</div>
                          <div>
                            <b className="text-[15px]">{r.name}</b>
                            <div className="text-ink-faint text-[13px]">{r.when}</div>
                          </div>
                        </div>
                        <p className="text-ink-soft text-[14.5px] mt-2">{r.text}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-3.5">Reviews</h2>
                  <p className="text-ink-soft text-base leading-relaxed">No reviews yet. This is a new listing on Gathr, be one of the first to book it.</p>
                </>
              )}
            </div>
          </div>

          {/* Booking card */}
          <aside>
            <div className="sticky top-24 border border-line-strong rounded-lg p-6 shadow-pop bg-white">
              <div className="flex items-baseline gap-1.5 mb-4">
                <b className="text-[26px] font-extrabold font-mono">{peso(venue.pricePerHour)}</b>
                <span className="text-ink-soft text-[15px]">/ {unitW}{unit !== 'hour' && venue.includedHours ? ` · ${venue.includedHours} hrs` : ''}</span>
              </div>

              <div className="border border-line-strong rounded-[14px] overflow-hidden mb-3.5">
                <div className="grid grid-cols-2">
                  <div className="py-[11px] px-3.5 border-b border-r border-line-strong">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.04em]">Date</label>
                    <input type="date" min={todayStr} value={date} onChange={(e) => setDate(e.target.value)} className="border-0 outline-0 w-full font-[inherit] text-sm bg-transparent text-ink appearance-none pt-0.5" />
                  </div>
                  <div className="py-[11px] px-3.5 border-b border-line-strong">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.04em]">Event</label>
                    <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="border-0 outline-0 w-full font-[inherit] text-sm bg-transparent text-ink appearance-none pt-0.5">
                      <option value="">Select</option>
                      {typeLabels.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="py-[11px] px-3.5 border-r border-line-strong">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.04em]">{unit === 'hour' ? 'Hours' : lockedDuration ? 'Duration · set by host' : 'Duration (hrs)'}</label>
                    <input type="number" min="1" max="24" value={hours} disabled={lockedDuration}
                      onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))}
                      className="border-0 outline-0 w-full font-[inherit] text-sm bg-transparent text-ink appearance-none pt-0.5" style={lockedDuration ? { color: 'var(--ink-soft)', cursor: 'not-allowed' } : undefined} />
                  </div>
                  <div className="py-[11px] px-3.5">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.04em]">Guests</label>
                    <input type="number" min="1" max={venue.capacity} placeholder={`Max ${venue.capacity}`} value={guests} onChange={(e) => setGuests(e.target.value)} className="border-0 outline-0 w-full font-[inherit] text-sm bg-transparent text-ink appearance-none pt-0.5" />
                  </div>
                </div>
              </div>

              <div className="mb-3.5">
                <label className="block text-[11px] font-bold uppercase tracking-[0.04em] mb-1.5">Special requests <span className="font-normal text-ink-faint">(optional)</span></label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
                  placeholder="Anything the venue should know in advance — setup time, layout, catering, parking…" className="w-full border border-line-strong rounded-xl p-[11px] px-3.5 font-[inherit] text-sm outline-none min-h-[70px] resize-y focus:border-brand" />
              </div>

              <button className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed" onClick={onRequest} disabled={booking || requested}>
                {requested ? 'Request sent' : booking ? 'Sending…' : user ? 'Request to book' : 'Sign in to book'}
              </button>
              <div className="text-center text-ink-faint text-sm mt-3">No charge until {venue.host.name} confirms your date</div>

              {bookingError && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mt-3">{bookingError}</div>}

              <div className="mt-[18px] text-sm">
                <div className="flex justify-between py-1.5 text-ink-soft"><span>{unit === 'event' ? 'Venue (flat rate)' : `${peso(venue.pricePerHour)} × ${qty} ${unit === 'head' ? 'guests' : 'hours'}`}</span><span className="font-mono">{peso(subtotal)}</span></div>
                <div className="flex justify-between py-1.5 text-ink-soft"><span>Service fee</span><span className="font-mono">{peso(serviceFee)}</span></div>
                <div className="flex justify-between pt-3.5 mt-1.5 border-t border-line font-bold text-ink"><span>Total</span><span className="font-mono">{peso(total)}</span></div>
                {unit !== 'hour' && (
                  <p className="text-ink-soft text-xs mt-2">
                    {unit === 'head' ? 'Priced per head' : 'Flat rate'}{venue.includedHours ? ` · covers ${venue.includedHours} hours` : ''} — duration doesn't change the total.
                  </p>
                )}
              </div>

              {requested && (
                <div className="bg-tint border border-line-strong rounded-[14px] p-3.5 mt-3.5 text-sm text-ink flex gap-2.5 items-start">
                  <CheckCircle2 size={18} className="text-brand shrink-0 mt-0.5" />
                  <span>Request sent to {venue.host.name}. They typically reply within an hour. Track it under <Link to="/bookings" className="text-brand font-semibold">your bookings</Link>.</span>
                </div>
              )}

              {!ownListing && (
                <>
                  <div className="h-px bg-line my-4 mx-0" />
                  <button className="w-full py-[13px] px-4 rounded-xl border border-line-strong bg-white font-semibold text-[15px] text-ink transition-colors duration-150 hover:bg-tint inline-flex items-center justify-center gap-2" onClick={onMessage}>
                    <MessageSquare size={16} /> Message the Host
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2 items-center justify-center mt-3.5 text-ink-soft text-[13px]">
              <ShieldCheck size={16} className="text-brand" /> No payment until {venue.host.name} confirms your date
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="py-[26px] border-t border-line">
            <h2 className="text-xl font-bold mb-[18px]">{relatedTitle}</h2>
            <div className="venue-grid">
              {related.map((v) => <VenueCard key={v.id} venue={v} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
