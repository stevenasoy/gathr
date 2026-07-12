import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useVenues } from '../context/VenuesContext'
import Footer from '../components/Footer'
import type { Venue } from '../types'

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
    photo: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city === 'Cebu City' 
  },
  { 
    name: 'Makati', 
    tag: 'Polished private dining', 
    photo: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city === 'Makati' 
  },
  { 
    name: 'Taguig (BGC)', 
    tag: 'Sleek corporate space', 
    photo: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city === 'Taguig' 
  },
  { 
    name: 'Tagaytay', 
    tag: 'Garden weddings', 
    photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city === 'Tagaytay' 
  },
  { 
    name: 'Panglao, Bohol', 
    tag: 'Beachfront ceremonies', 
    photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city.includes('Bohol') 
  },
  { 
    name: 'Baguio', 
    tag: 'Cool-weather retreats', 
    photo: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city === 'Baguio' 
  },
  { 
    name: 'Iloilo City', 
    tag: 'Heritage venues', 
    photo: 'https://images.unsplash.com/photo-1578593139888-39622e2047de?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city === 'Iloilo City' 
  },
  { 
    name: 'Davao City', 
    tag: 'Workshops & offsites', 
    photo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city === 'Davao City' 
  },
  { 
    name: 'Quezon City', 
    tag: 'Studios & launches', 
    photo: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80',
    match: (v) => v.city === 'Quezon City' 
  },
]

export default function Cities() {
  const { venues } = useVenues()

  const cityTiles = useMemo(() => {
    return CITY_TILES
      .map((c) => ({ ...c, count: venues.filter(c.match).length }))
      .filter((c) => c.count > 0)
  }, [venues])

  return (
    <>
      <main className="max-w-wrap mx-auto px-6 sm:px-10 pt-[108px] pb-16 min-h-[80dvh]">
        <div className="mb-10 text-left">
          <h1 className="font-outfit text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight">
            Explore venues by city
          </h1>
          <p className="mt-3 text-lg text-ink-soft max-w-[600px] leading-relaxed">
            Find the perfect location for your next wedding, photo launch, corporate offsite, or private dinner across our covered destinations in the Philippines.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
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
      </main>
      <Footer />
    </>
  )
}
