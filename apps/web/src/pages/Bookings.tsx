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
          <section className="py-14 pb-10 bg-surface border-b border-line text-center">
            <div className="max-w-wrap mx-auto px-10">
              <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Your account</span>
              <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Your bookings</h1>
              <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">Sign in to see your venue requests and confirmed dates.</p>
            </div>
          </section>
          <div className="max-w-wrap mx-auto px-10 py-12 pb-20">
            <div className="text-center py-[60px] px-5 text-ink-soft">
              <CalendarCheck size={40} strokeWidth={1.5} className="mb-3.5 mx-auto text-ink-faint" />
              <h2 className="text-[22px] font-extrabold mb-2 text-ink">Sign in to view bookings</h2>
              <p className="max-w-[460px] mx-auto mb-5 text-[15px] leading-relaxed">Your booking requests are tied to your account. Sign in to see them here.</p>
              <Link to="/signin" state={{ from: '/bookings' }} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Sign in</Link>
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
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="max-w-wrap mx-auto px-10">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Your account</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Your bookings</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">{rows.length ? <><span className="font-mono">{rows.length}</span> request{rows.length > 1 ? 's' : ''} on file.</> : 'Trips, events, and confirmed dates will live here.'}</p>
          </div>
        </section>

        <div className="max-w-wrap mx-auto px-10 py-12 pb-20">
          {cancelError && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mb-3.5">{cancelError}</div>}
          {error ? (
            <div className="text-center py-[60px] px-5 text-ink-soft">
              <p>{error}</p>
              <button className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '12px 22px' }} onClick={() => location.reload()}>Retry</button>
            </div>
          ) : loading || authLoading ? (
            <div className="text-center py-[60px] px-5 text-ink-soft"><p>Loading your bookings…</p></div>
          ) : rows.length ? (
            <div className="flex flex-col gap-3.5">
              {rows.map((b) => (
                <div className="flex justify-between items-center gap-[18px] border border-line rounded p-[18px] px-5 bg-white flex-col md:flex-row md:items-center" key={b.id}>
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
                    </div>
                    {b.note && <div className="mt-2 text-[13.5px] text-ink-soft flex gap-1.5 items-start"><StickyNote size={15} className="text-brand shrink-0 mt-0.5" /> <span>{b.note}</span></div>}
                  </div>
                  <div className="text-right flex flex-col md:items-end gap-1.5 w-full md:w-auto flex-row md:flex-col items-center justify-between">
                    <b className="text-[17px] font-mono">{peso(b.total_php)}</b>
                    {b.status === 'requested' ? (
                      <button className="font-semibold text-[13px] text-brand hover:underline inline-flex items-center gap-1" onClick={() => onCancel(b.id)}>
                        <X size={14} /> Cancel
                      </button>
                    ) : b.status === 'confirmed' ? (
                      <span className="text-ink-soft text-xs">Confirmed · message the venue to change</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-[60px] px-5 text-ink-soft">
              <CalendarCheck size={40} strokeWidth={1.5} className="mb-3.5 mx-auto text-ink-faint" />
              <h2 className="text-[22px] font-extrabold mb-2 text-ink">No bookings yet</h2>
              <p className="max-w-[460px] mx-auto mb-5 text-[15px] leading-relaxed">When you request a venue, your itinerary and status will show up here.</p>
              <Link to="/search" className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Find a venue</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
