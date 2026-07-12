import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search, CalendarCheck, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import CategoryRow from '../components/CategoryRow'
import VenueCard from '../components/VenueCard'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import type { Venue } from '../types'

interface HomeSection {
  title: string
  test: (v: Venue) => boolean
}

const SECTIONS: HomeSection[] = [
  { title: 'Top-rated venues in Cebu', test: (v) => v.city.includes('Cebu') },
  { title: 'Rooftops & spaces for parties', test: (v) => v.types.includes('rooftop') || v.types.includes('party') },
  { title: 'Made for weddings', test: (v) => v.types.includes('wedding') },
  { title: 'Offsites & workshops', test: (v) => v.types.includes('corporate') || v.types.includes('workshop') },
]

interface HowStep {
  icon: LucideIcon
  title: string
  body: string
}

const STEPS: HowStep[] = [
  {
    icon: Search,
    title: 'Browse real venues',
    body: 'Filter by event type, capacity, city, and budget. Every listing has transparent pricing and real guest reviews.',
  },
  {
    icon: CalendarCheck,
    title: 'Lock the date',
    body: 'Check live availability, request the slot, and chat with the host. No hidden fees, no broker games.',
  },
  {
    icon: Sparkles,
    title: 'Host the moment',
    body: 'Show up to a space that is set and ready. Your on-site coordinator handles the rest.',
  },
]

interface CityTile {
  name: string
  tag: string
  photo: string
  match: (v: Venue) => boolean
}

const CITY_TILES: CityTile[] = [
  { 
    name: 'Cebu City', 
    tag: 'Where Gathr started', 
    photo: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city === 'Cebu City' 
  },
  { 
    name: 'Makati', 
    tag: 'Polished private dining', 
    photo: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city === 'Makati' 
  },
  { 
    name: 'Taguig (BGC)', 
    tag: 'Sleek corporate space', 
    photo: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city === 'Taguig' 
  },
  { 
    name: 'Tagaytay', 
    tag: 'Garden weddings', 
    photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city === 'Tagaytay' 
  },
  { 
    name: 'Panglao, Bohol', 
    tag: 'Beachfront ceremonies', 
    photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city.includes('Bohol') 
  },
  { 
    name: 'Baguio', 
    tag: 'Cool-weather retreats', 
    photo: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city === 'Baguio' 
  },
  { 
    name: 'Iloilo City', 
    tag: 'Heritage venues', 
    photo: 'https://images.unsplash.com/photo-1578593139888-39622e2047de?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city === 'Iloilo City' 
  },
  { 
    name: 'Davao City', 
    tag: 'Workshops & offsites', 
    photo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city === 'Davao City' 
  },
  { 
    name: 'Quezon City', 
    tag: 'Studios & launches', 
    photo: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=400&q=80',
    match: (v) => v.city === 'Quezon City' 
  },
]

export default function Home() {
  const [cat, setCat] = useState('all')
  const { hash } = useLocation()
  const { user } = useAuth()
  const { venues } = useVenues()

  useEffect(() => {
    if (!hash) return
    // Wait for DOM layout and venue cards to fully render before scrolling
    const timer = setTimeout(() => {
      const el = document.querySelector(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
    return () => clearTimeout(timer)
  }, [hash])

  const sections = useMemo(() => {
    if (cat === 'all') {
      return SECTIONS.map((s) => ({ ...s, items: venues.filter(s.test), rail: true })).filter((s) => s.items.length)
    }
    const items = venues.filter((v) => v.types.includes(cat))
    return [{ title: 'Matching venues', items, rail: false }]
  }, [cat, venues])

  const cityTiles = useMemo(() => {
    return CITY_TILES
      .map((c) => ({ ...c, count: venues.filter(c.match).length }))
      .filter((c) => c.count > 0)
  }, [venues])

  return (
    <>
      <section className="relative overflow-hidden bg-canvas min-h-[100dvh] -mt-[88px] flex items-center">
        {/* Layered ambient lighting for a premium mesh glow */}
        <div className="absolute inset-0 z-0 opacity-80" style={{ 
          background: `
            radial-gradient(at 90% 10%, rgba(194, 90, 30, 0.09) 0px, transparent 50%),
            radial-gradient(at 10% 90%, rgba(28, 77, 56, 0.05) 0px, transparent 50%),
            radial-gradient(at 50% 50%, rgba(194, 90, 30, 0.02) 0px, transparent 80%)
          `
        }} />
        <div className="max-w-wrap mx-auto px-6 sm:px-10 pt-[108px] pb-16 relative z-[1] text-left w-full">
          <div className="grid grid-cols-1 gap-10 items-center min-[1100px]:grid-cols-2 min-[1100px]:gap-12 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              {user ? (
                <h1 className="font-outfit text-[clamp(32px,3.8vw,54px)] font-extrabold leading-[1.1] mb-5 max-w-[680px] tracking-[-0.03em] text-ink">
                  Welcome back.<br />Find your next <span className="font-display italic font-bold bg-gradient bg-clip-text text-transparent pr-1">space.</span>
                </h1>
              ) : (
                <h1 className="font-outfit text-[clamp(32px,3.8vw,54px)] font-extrabold leading-[1.1] mb-5 max-w-[680px] tracking-[-0.03em] text-ink">
                  Book the space.<br /><span className="font-display italic font-bold bg-gradient bg-clip-text text-transparent pr-1">Make it a moment.</span>
                </h1>
              )}
              <p className="text-[clamp(16px,1.5vw,18px)] text-ink-soft mb-9 max-w-[520px] leading-relaxed opacity-95">
                From beachfront weddings to rooftop launches, find and book extraordinary venues across the Philippines.
              </p>
              <div className="flex justify-start"><SearchBar /></div>
              <div className="flex justify-start items-center gap-3 mt-8 flex-wrap text-ink-soft text-[13px] font-mono font-medium">
                <span>Transparent pricing</span>
                <span className="text-line-strong">·</span>
                <span>Real guest reviews</span>
                <span className="text-line-strong">·</span>
                <span>Book direct with the venue</span>
              </div>
            </div>

            {/* Desktop grid (visible on min-[1100px] and above) */}
            <div className="hidden min-[1100px]:grid grid-cols-2 gap-4 relative" aria-hidden="true">
              <div className="flex flex-col gap-4">
                <div className="relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1 aspect-[4/5]">
                  <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80" alt="Garden Wedding" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                    <span>Garden Lawn</span>
                    <span className="font-mono text-xs text-brand">Tagaytay</span>
                  </div>
                </div>
                <div className="relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1 aspect-[4/5]">
                  <img src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=400&q=80" alt="Photo Studio" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                    <span>Photo Studio</span>
                    <span className="font-mono text-xs text-brand">Quezon City</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 min-[1100px]:pt-8">
                <div className="relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1 aspect-[4/5]">
                  <img src="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=400&q=80" alt="Rooftop Party" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                    <span>Rooftop Loft</span>
                    <span className="font-mono text-xs text-brand">Cebu City</span>
                  </div>
                </div>
                <div className="relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1 aspect-[4/5]">
                  <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" alt="Beach Resort" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                    <span>Beach Cove</span>
                    <span className="font-mono text-xs text-brand">Bohol</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Horizontal Scroll Carousel (visible below min-[1100px]) */}
          <div className="min-[1100px]:hidden mt-10 w-full" aria-hidden="true">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-6 px-6 sm:-mx-10 sm:px-10">
              <div className="snap-start shrink-0 w-[240px] aspect-[4/5] relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-all duration-300">
                <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80" alt="Garden Wedding" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                  <span>Garden Lawn</span>
                  <span className="font-mono text-[10px] text-brand uppercase tracking-wider">Tagaytay</span>
                </div>
              </div>
              <div className="snap-start shrink-0 w-[240px] aspect-[4/5] relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-all duration-300">
                <img src="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=400&q=80" alt="Rooftop Party" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                  <span>Rooftop Loft</span>
                  <span className="font-mono text-[10px] text-brand uppercase tracking-wider">Cebu City</span>
                </div>
              </div>
              <div className="snap-start shrink-0 w-[240px] aspect-[4/5] relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-all duration-300">
                <img src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=400&q=80" alt="Photo Studio" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                  <span>Photo Studio</span>
                  <span className="font-mono text-[10px] text-brand uppercase tracking-wider">Quezon City</span>
                </div>
              </div>
              <div className="snap-start shrink-0 w-[240px] aspect-[4/5] relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-all duration-300">
                <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" alt="Beach Resort" className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                  <span>Beach Cove</span>
                  <span className="font-mono text-[10px] text-brand uppercase tracking-wider">Bohol</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-line-strong"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-line-strong"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-line-strong"></span>
            </div>
          </div>
        </div>
      </section>

      <div className="venues-section-wrap">
        <CategoryRow active={cat} onChange={setCat} />
        <div className="max-w-wrap mx-auto px-6 sm:px-10">
          {sections.map((s) => (
            <section className="pt-9 pb-2" key={s.title}>
              <div className="flex items-baseline justify-between mb-[18px]">
                <h2 className="text-2xl font-extrabold flex items-center gap-2">{s.title}</h2>
                <Link to="/search" className="font-semibold text-sm text-brand hover:underline">View all</Link>
              </div>
              <div className={s.rail ? 'venue-grid rail' : 'venue-grid'}>
                {s.items.map((v) => <VenueCard key={v.id} venue={v} />)}
              </div>
            </section>
          ))}
          {sections.every((s) => !s.items.length) && (
            <div className="text-center py-20 px-5 text-ink-soft"><h3 className="text-xl text-ink mb-2">No venues in this category yet</h3><p>Try another event type.</p></div>
          )}
        </div>
      </div>

      <main className="max-w-wrap mx-auto px-6 sm:px-10">
        <section id="how" className="pt-9 pb-2 scroll-mt-40">
          <div className="flex items-baseline justify-between mb-[18px]">
            <h2 className="text-2xl font-extrabold flex items-center gap-2">How Gathr works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div 
                className="group relative bg-surface border border-line rounded-3xl p-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(194,90,30,0.08)] hover:border-brand/35" 
                key={s.title}
              >
                {/* Step number badge */}
                <div className="absolute top-6 right-6 font-mono font-bold text-xs tracking-wider text-ink-faint bg-ink/[0.03] px-2.5 py-1 rounded-full">
                  Step {String(i + 1).padStart(2, '0')}
                </div>
                
                {/* Icon Wrapper */}
                <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand grid place-items-center mb-6 transition-transform duration-500 group-hover:scale-110">
                  <s.icon size={22} />
                </div>
                
                {/* Heading */}
                <h3 className="text-[19px] font-extrabold text-ink mb-2.5 font-outfit tracking-tight">
                  {s.title}
                </h3>
                
                {/* Description */}
                <p className="text-[14.5px] leading-relaxed text-ink-soft m-0">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="cities" className="pt-9 pb-2 scroll-mt-40">
          <div className="flex items-baseline justify-between mb-[18px]">
            <h2 className="text-2xl font-extrabold flex items-center gap-2">Cities we cover</h2>
            <Link to="/search" className="font-semibold text-sm text-brand hover:underline">View all venues</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {cityTiles.map((c) => (
              <Link
                to={`/search?where=${encodeURIComponent(c.name.replace(/\s*\(.+\)$/, ''))}`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/5] border border-line bg-tint transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(18,16,22,0.15)]"
                key={c.name}
              >
                {/* Background Image with Zoom */}
                <img 
                  src={c.photo} 
                  alt={c.name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105" 
                />
                
                {/* Visual dark gradient overlay to guarantee text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-[1]" />
                
                {/* Immersive Text Content */}
                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end z-[2] text-white">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                    <span className="font-outfit font-extrabold text-[15px] sm:text-[18px] tracking-tight leading-tight">{c.name}</span>
                    <span className="text-[9px] font-bold font-mono tracking-wider bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded text-white uppercase whitespace-nowrap w-fit">
                      {c.count} space{c.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-[13px] text-white/80 mt-1 font-medium leading-normal">{c.tag}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
