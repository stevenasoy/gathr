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
      <section className="hero">
        <div className="hero-glow" />
        <div className={'wrap hero-inner' + (user ? ' compact' : '')}>
          {!user && (
            <>
              <h1>Book the space.<br /><span className="accent">Make it a moment.</span></h1>
              <p>From beachfront weddings to rooftop launches, find and book extraordinary venues across the Philippines.</p>
            </>
          )}
          <div className="hero-search"><SearchBar /></div>
          <div className="hero-trust">
            <span>Transparent pricing</span>
            <span className="dot">·</span>
            <span>Real guest reviews</span>
            <span className="dot">·</span>
            <span>Book direct with the venue</span>
          </div>
        </div>
      </section>

      <CategoryRow active={cat} onChange={setCat} />

      <main className="wrap">
        {sections.map((s) => (
          <section className="section" key={s.title}>
            <div className="section-head">
              <h2>{s.title}</h2>
              <Link to="/search">View all</Link>
            </div>
            <div className={s.rail ? 'grid rail' : 'grid'}>
              {s.items.map((v) => <VenueCard key={v.id} venue={v} />)}
            </div>
          </section>
        ))}
        {sections.every((s) => !s.items.length) && (
          <div className="empty"><h3>No venues in this category yet</h3><p>Try another event type.</p></div>
        )}

        <section id="how" className="section how-section">
          <div className="section-head">
            <h2>How Gathr works</h2>
          </div>
          <div className="how-grid">
            {STEPS.map((s, i) => (
              <div className="how-card" key={s.title}>
                <div className="how-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="how-icon"><s.icon size={22} /></div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="cities" className="section cities-section">
          <div className="section-head">
            <h2>Cities we cover</h2>
            <Link to="/search">View all venues</Link>
          </div>
          <div className="cities-grid">
            {cityTiles.map((c) => (
              <Link
                to={`/search?where=${encodeURIComponent(c.name.replace(/\s*\(.+\)$/, ''))}`}
                className="city-tile"
                key={c.name}
              >
                <div className="city-tile-head">
                  <span className="city-name">{c.name}</span>
                  <span className="city-count">{c.count} venue{c.count > 1 ? 's' : ''}</span>
                </div>
                <span className="city-tag">{c.tag}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
