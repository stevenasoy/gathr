import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import VenueCard from '../components/VenueCard'
import Footer from '../components/Footer'
import { useVenues } from '../context/VenuesContext'
import { AMENITIES } from '../data/categories'
import { peso } from '../lib/format'

const PRICE_MAX = 10000
const PAGE_SIZE = 24

export default function Search() {
  const [params] = useSearchParams()
  const { venues } = useVenues()
  const qWhere = params.get('where') || ''
  const qType = params.get('type') || ''
  const qGuests = Number(params.get('guests')) || 0
  const qDate = params.get('date') || ''

  const [maxPrice, setMaxPrice] = useState(PRICE_MAX)
  const [amenities, setAmenities] = useState<string[]>([])
  const [sort, setSort] = useState('recommended')
  const [showFilters, setShowFilters] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 1080 : false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Reset pagination when the search query changes.
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [qWhere, qType])

  const toggleAmenity = (a: string) =>
    setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]))

  const clearAll = () => { setMaxPrice(PRICE_MAX); setAmenities([]) }

  const results = useMemo(() => {
    let list = venues.filter((v) => {
      if (qWhere && !`${v.city} ${v.area || ''}`.toLowerCase().includes(qWhere.toLowerCase())) return false
      if (qType && !v.types.includes(qType)) return false
      if (qGuests && v.capacity < qGuests) return false
      // At the slider max the range is open-ended ("₱10,000+"); applying the
      // cap there would silently hide premium flat-rate venues.
      if (maxPrice < PRICE_MAX && v.pricePerHour > maxPrice) return false
      if (amenities.length && !amenities.every((a) => v.amenities.includes(a))) return false
      return true
    })
    if (sort === 'price-low') list = [...list].sort((a, b) => a.pricePerHour - b.pricePerHour)
    if (sort === 'price-high') list = [...list].sort((a, b) => b.pricePerHour - a.pricePerHour)
    if (sort === 'rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    if (sort === 'capacity') list = [...list].sort((a, b) => b.capacity - a.capacity)
    return list
  }, [venues, qWhere, qType, qGuests, maxPrice, amenities, sort])

  const activeFilters = (maxPrice < PRICE_MAX ? 1 : 0) + amenities.length

  return (
    <>
      <div className="border-b border-line bg-surface relative z-[45]">
        <div className="max-w-wrap mx-auto px-10 flex items-center justify-between gap-4 py-4">
          <SearchBar compact key={params.toString()} initial={{ where: qWhere, type: qType, guests: qGuests ? String(qGuests) : '', date: qDate }} />
          <button className="border border-line-strong rounded-xl py-2.5 px-4 font-[inherit] text-sm font-semibold bg-white text-ink-soft shadow-[0_1px_2px_rgba(18,16,22,0.04)] transition-all duration-150 cursor-pointer inline-flex items-center hover:border-brand hover:text-ink hover:shadow-[0_2px_6px_rgba(194,90,30,0.08)]" onClick={() => setShowFilters((s) => !s)} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <SlidersHorizontal size={16} /> Filters{activeFilters ? ` (${activeFilters})` : ''}
          </button>
        </div>
      </div>

      <div className={`max-w-wrap mx-auto px-10 grid pt-[26px] items-start transition-[grid-template-columns,gap] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${showFilters ? 'lg:grid-cols-[264px_1fr] lg:gap-x-[34px]' : 'grid-cols-1 gap-0'}`}>
        <aside className={`sticky top-[88px] bg-white border border-line-strong rounded-[20px] p-6 shadow-[0_4px_20px_rgba(18,16,22,0.02)] ${showFilters ? 'block' : 'hidden'}`}>
          <div className="flex justify-between items-center mb-[18px]">
            <h3 className="text-[17px] font-extrabold m-0 text-ink">Filters</h3>
            {activeFilters > 0 && <button className="font-semibold text-[13px] text-brand hover:underline" onClick={clearAll}>Clear all</button>}
          </div>

          <div className="py-5 border-b border-line first:pt-0">
            <label className="block text-[13.5px] font-bold mb-3 text-ink">Max price / hour</label>
            <input type="range" min="2000" max={PRICE_MAX} step="500" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-brand h-1 rounded-full bg-line-strong" />
            <div className="text-[13px] font-semibold text-brand mt-2 font-mono">Up to {peso(maxPrice)}{maxPrice >= PRICE_MAX ? '+' : ''}</div>
          </div>

          <div className="py-5 border-b border-line last:border-b-0 last:pb-0">
            <label className="block text-[13.5px] font-bold mb-3 text-ink">Amenities</label>
            {AMENITIES.map((a) => (
              <label key={a} className="flex items-center gap-2.5 py-1.5 text-[14.5px] text-ink-soft cursor-pointer transition-colors duration-150 hover:text-ink">
                <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)} className="w-4 h-4 accent-brand cursor-pointer" />
                {a}
              </label>
            ))}
          </div>
        </aside>

        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2.5">
            <h1 className="text-[22px] font-extrabold">{qWhere ? `Venues in ${qWhere}` : 'All venues'} <span className="text-ink-soft font-medium text-sm font-mono">· {results.length} found</span></h1>
            <select className="border border-line-strong rounded-xl py-2.5 px-4 font-[inherit] text-sm font-semibold bg-white text-ink-soft shadow-[0_1px_2px_rgba(18,16,22,0.04)] transition-all duration-150 cursor-pointer inline-flex items-center hover:border-brand hover:text-ink hover:shadow-[0_2px_6px_rgba(194,90,30,0.08)] appearance-none pr-9" value={sort} onChange={(e) => setSort(e.target.value)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235c5752' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '14px' }}>
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="rating">Top rated</option>
              <option value="capacity">Largest capacity</option>
            </select>
          </div>

          {results.length ? (
            <>
              <div className="grid">
                {results.slice(0, visibleCount).map((v) => <VenueCard key={v.id} venue={v} />)}
              </div>
              {results.length > visibleCount && (
                <button
                  className="font-semibold text-[13px] text-brand hover:underline"
                  style={{ margin: '24px auto', display: 'block' }}
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load more venues
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-20 px-5 text-ink-soft">
              <h3 className="text-xl text-ink mb-2">No venues match those filters</h3>
              <p>Try widening your price range or clearing a filter.</p>
              <button className="font-semibold text-[13px] text-brand hover:underline" onClick={clearAll} style={{ marginTop: 12 }}>Clear all filters</button>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </>
  )
}
