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
  match: (v: Venue) => boolean
}

const CITY_TILES: CityTile[] = [
  { name: 'Cebu City', tag: 'Where Gathr started', match: (v) => v.city === 'Cebu City' },
  { name: 'Makati', tag: 'Polished private dining', match: (v) => v.city === 'Makati' },
  { name: 'Taguig (BGC)', tag: 'Sleek corporate space', match: (v) => v.city === 'Taguig' },
  { name: 'Tagaytay', tag: 'Garden weddings', match: (v) => v.city === 'Tagaytay' },
  { name: 'Panglao, Bohol', tag: 'Beachfront ceremonies', match: (v) => v.city.includes('Bohol') },
  { name: 'Baguio', tag: 'Cool-weather retreats', match: (v) => v.city === 'Baguio' },
  { name: 'Iloilo City', tag: 'Heritage venues', match: (v) => v.city === 'Iloilo City' },
  { name: 'Davao City', tag: 'Workshops & offsites', match: (v) => v.city === 'Davao City' },
  { name: 'Quezon City', tag: 'Studios & launches', match: (v) => v.city === 'Quezon City' },
]

export default function Home() {
  const [cat, setCat] = useState('all')
  const { hash } = useLocation()
  const { user } = useAuth()
  const { venues } = useVenues()

  useEffect(() => {
    if (!hash) return
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(80% 60% at 90% 10%, rgba(194,90,30,0.06), rgba(28,77,56,0.03) 50%, transparent 80%)' }} />
        <div className="max-w-wrap mx-auto px-10 pt-[108px] pb-16 relative z-[1] text-left w-full">
          <div className="grid grid-cols-1 gap-10 items-center lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
            <div>
              {user ? (
                <h1 className="font-outfit text-[clamp(38px,4.5vw,62px)] font-extrabold leading-[1.05] mb-5 max-w-[680px] tracking-[-0.03em] text-ink">Welcome back.<br />Find your next <span className="font-display italic font-semibold bg-gradient bg-clip-text text-transparent pr-1">space.</span></h1>
              ) : (
                <h1 className="font-outfit text-[clamp(38px,4.5vw,62px)] font-extrabold leading-[1.05] mb-5 max-w-[680px] tracking-[-0.03em] text-ink">Book the space.<br /><span className="font-display italic font-semibold bg-gradient bg-clip-text text-transparent pr-1">Make it a moment.</span></h1>
              )}
              <p className="text-[clamp(16px,1.8vw,19px)] text-ink-soft mb-9 max-w-[520px] leading-normal">From beachfront weddings to rooftop launches, find and book extraordinary venues across the Philippines.</p>
              <div className="flex justify-start"><SearchBar /></div>
              <div className="flex justify-start items-center gap-3 mt-8 flex-wrap text-ink-soft text-[13px] font-mono font-medium">
                <span>Transparent pricing</span>
                <span className="text-line-strong">·</span>
                <span>Real guest reviews</span>
                <span className="text-line-strong">·</span>
                <span>Book direct with the venue</span>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4 relative" aria-hidden="true">
              <div className="flex flex-col gap-4">
                <div className="relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1 lg:aspect-[4/5]">
                  <img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80" alt="Garden Wedding" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                    <span>Garden Lawn</span>
                    <span className="font-mono text-xs text-brand">Tagaytay</span>
                  </div>
                </div>
                <div className="relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1 lg:aspect-[4/5]">
                  <img src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&w=400&q=80" alt="Photo Studio" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                    <span>Photo Studio</span>
                    <span className="font-mono text-xs text-brand">Quezon City</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 lg:pt-8">
                <div className="relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1 lg:aspect-[4/5]">
                  <img src="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=400&q=80" alt="Rooftop Party" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                    <span>Rooftop Loft</span>
                    <span className="font-mono text-xs text-brand">Cebu City</span>
                  </div>
                </div>
                <div className="relative rounded-lg overflow-hidden shadow-pop border border-line bg-tint transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1 lg:aspect-[4/5]">
                  <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" alt="Beach Resort" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/[0.92] backdrop-blur-lg px-3 py-2 rounded-lg text-xs font-bold text-ink flex justify-between items-center shadow-card border border-white/[0.4] z-[2]">
                    <span>Beach Cove</span>
                    <span className="font-mono text-xs text-brand">Bohol</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="venues-section-wrap">
        <CategoryRow active={cat} onChange={setCat} />
        <div className="max-w-wrap mx-auto px-10">
          {sections.map((s) => (
            <section className="pt-9 pb-2" key={s.title}>
              <div className="flex items-baseline justify-between mb-[18px]">
                <h2 className="text-2xl font-extrabold flex items-center gap-2">{s.title}</h2>
                <Link to="/search" className="font-semibold text-sm text-brand hover:underline">View all</Link>
              </div>
              <div className={s.rail ? 'grid rail' : 'grid'}>
                {s.items.map((v) => <VenueCard key={v.id} venue={v} />)}
              </div>
            </section>
          ))}
          {sections.every((s) => !s.items.length) && (
            <div className="text-center py-20 px-5 text-ink-soft"><h3 className="text-xl text-ink mb-2">No venues in this category yet</h3><p>Try another event type.</p></div>
          )}
        </div>
      </div>

      <main className="max-w-wrap mx-auto px-10">
        <section id="how" className="pt-9 pb-2 scroll-mt-40">
          <div className="flex items-baseline justify-between mb-[18px]">
            <h2 className="text-2xl font-extrabold flex items-center gap-2">How Gathr works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div className={`relative bg-ink/[0.02] border border-ink/[0.04] p-2 rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-pop ${i === 0 ? 'bg-[rgba(194,90,30,0.06)] border-[rgba(194,90,30,0.12)] shadow-[0_12px_30px_rgba(194,90,30,0.1)] hover:shadow-[0_16px_36px_rgba(194,90,30,0.2)]' : ''}`} key={s.title}>
                <div className={`rounded-[18px] px-6 py-8 h-full relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] ${i === 0 ? 'bg-brand text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]' : 'bg-surface'}`}>
                  <div className={`absolute top-[22px] right-[26px] font-mono font-bold text-[13px] tracking-[0.04em] ${i === 0 ? 'text-white/[0.4]' : 'text-ink-faint'}`}>{String(i + 1).padStart(2, '0')}</div>
                  <div className={`w-11 h-11 rounded-xl grid place-items-center mb-4 ${i === 0 ? 'bg-white/[0.15] text-white' : 'bg-tint text-brand'}`}><s.icon size={22} /></div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className={`text-[14.5px] leading-relaxed m-0 ${i === 0 ? 'text-white/[0.85]' : 'text-ink-soft'}`}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="cities" className="pt-9 pb-2 scroll-mt-40">
          <div className="flex items-baseline justify-between mb-[18px]">
            <h2 className="text-2xl font-extrabold flex items-center gap-2">Cities we cover</h2>
            <Link to="/search" className="font-semibold text-sm text-brand hover:underline">View all venues</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
            {cityTiles.map((c) => (
              <Link
                to={`/search?where=${encodeURIComponent(c.name.replace(/\s*\(.+\)$/, ''))}`}
                className="bg-ink/[0.02] border border-ink/[0.04] p-2 rounded-[20px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] hover:shadow-bar hover:border-brand/[0.3]"
                key={c.name}
              >
                <div className="bg-surface rounded-[14px] px-5 py-[18px] h-full flex flex-col gap-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="font-outfit font-bold text-[17px] text-ink">{c.name}</span>
                    <span className="text-xs font-semibold text-ink-faint whitespace-nowrap font-mono">{c.count} venue{c.count > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-[13.5px] text-ink-soft">{c.tag}</span>
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
