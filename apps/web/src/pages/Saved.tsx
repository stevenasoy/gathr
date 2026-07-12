import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import VenueCard from '../components/VenueCard'
import { VenueGridSkeleton } from '../components/Skeleton'
import Footer from '../components/Footer'
import { useSaved } from '../context/SavedContext'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'

export default function Saved() {
  const { ids, loading } = useSaved()
  const { user } = useAuth()
  const { venues } = useVenues()
  const saved = useMemo(() => venues.filter((v) => ids.includes(v.id)), [venues, ids])

  return (
    <>
      <main>
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="max-w-wrap mx-auto px-10">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Your account</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Saved venues</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">
              {saved.length
                ? <><span className="font-mono">{saved.length}</span> venue{saved.length > 1 ? 's' : ''} saved{user ? ' to your account.' : ' on this device.'}</>
                : 'Tap the heart on any venue to save it here.'}
            </p>
          </div>
        </section>

        <div className="max-w-wrap mx-auto px-10 py-12 pb-20">
          {loading ? (
            <VenueGridSkeleton count={6} />
          ) : saved.length ? (
            <div className="venue-grid">
              {saved.map((v) => <VenueCard key={v.id} venue={v} />)}
            </div>
          ) : (
            <div className="text-center py-[60px] px-5 text-ink-soft">
              <Heart size={40} strokeWidth={1.5} className="mb-3.5 mx-auto text-ink-faint" />
              <h2 className="text-[22px] font-extrabold mb-2 text-ink">No saved venues yet</h2>
              <p className="max-w-[460px] mx-auto mb-5 text-[15px] leading-relaxed">Browse venues and tap the heart icon to keep a shortlist.{user ? ' It syncs to your account across devices.' : ' Sign in to keep it across devices.'}</p>
              <Link to="/search" className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Browse venues</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
