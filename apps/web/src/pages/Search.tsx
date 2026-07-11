import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import VenueCard from '../components/VenueCard'
import Footer from '../components/Footer'
import { useVenues } from '../context/VenuesContext'
import { CATEGORIES, AMENITIES } from '../data/categories'
import { peso } from '../lib/format'

const PRICE_MAX = 10000

export default function Search() {
  const [params] = useSearchParams()
  const { venues } = useVenues()
  const qWhere = params.get('where') || ''
  const qType = params.get('type') || ''
  const qGuests = Number(params.get('guests')) || 0
  const qDate = params.get('date') || ''

  const [type, setType] = useState(qType)
  const [minGuests, setMinGuests] = useState(qGuests)
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX)
  const [amenities, setAmenities] = useState<string[]>([])
  const [sort, setSort] = useState('recommended')
  const [showFilters, setShowFilters] = useState(false)

  // Re-searching from the compact bar changes the URL without remounting this
  // page, so pull the new query values back into the filter state.
  useEffect(() => { setType(qType) }, [qType])
  useEffect(() => { setMinGuests(qGuests) }, [qGuests])

  const toggleAmenity = (a: string) =>
    setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]))

  const clearAll = () => { setType(''); setMinGuests(0); setMaxPrice(PRICE_MAX); setAmenities([]) }

  const results = useMemo(() => {
    let list = venues.filter((v) => {
      if (qWhere && !`${v.city} ${v.area || ''}`.toLowerCase().includes(qWhere.toLowerCase())) return false
      if (type && !v.types.includes(type)) return false
      if (minGuests && v.capacity < minGuests) return false
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
  }, [venues, qWhere, type, minGuests, maxPrice, amenities, sort])

  const activeFilters = (type ? 1 : 0) + (minGuests ? 1 : 0) + (maxPrice < PRICE_MAX ? 1 : 0) + amenities.length

  return (
    <>
      <div className="searchbar-wrap">
        <div className="wrap searchbar-row">
          <SearchBar compact key={params.toString()} initial={{ where: qWhere, type: qType, guests: qGuests ? String(qGuests) : '', date: qDate }} />
          <button className="select-sort" onClick={() => setShowFilters((s) => !s)} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <SlidersHorizontal size={16} /> Filters{activeFilters ? ` (${activeFilters})` : ''}
          </button>
        </div>
      </div>

      <div className="wrap results-layout">
        <aside className={'filters' + (showFilters ? ' open' : '')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Filters</h3>
            {activeFilters > 0 && <button className="btn-clear" onClick={clearAll}>Clear all</button>}
          </div>

          <div className="filter-group">
            <label>Event type</label>
            <div className="chiprow">
              {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <button key={c.id} className={'chip' + (type === c.id ? ' on' : '')}
                  onClick={() => setType(type === c.id ? '' : c.id)}>{c.label}</button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Minimum capacity</label>
            <input type="range" min="0" max="250" step="10" value={minGuests} onChange={(e) => setMinGuests(Number(e.target.value))} />
            <div className="range-val">{minGuests ? `${minGuests}+ guests` : 'Any size'}</div>
          </div>

          <div className="filter-group">
            <label>Max price / hour</label>
            <input type="range" min="2000" max={PRICE_MAX} step="500" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
            <div className="range-val">Up to {peso(maxPrice)}{maxPrice >= PRICE_MAX ? '+' : ''}</div>
          </div>

          <div className="filter-group">
            <label>Amenities</label>
            {AMENITIES.map((a) => (
              <label key={a} className="amenity-check">
                <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)} />
                {a}
              </label>
            ))}
          </div>
        </aside>

        <section>
          <div className="results-head">
            <h1>{qWhere ? `Venues in ${qWhere}` : 'All venues'} <span className="muted">· {results.length} found</span></h1>
            <select className="select-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="rating">Top rated</option>
              <option value="capacity">Largest capacity</option>
            </select>
          </div>

          {results.length ? (
            <div className="grid">
              {results.map((v) => <VenueCard key={v.id} venue={v} />)}
            </div>
          ) : (
            <div className="empty">
              <h3>No venues match those filters</h3>
              <p>Try widening your price range or clearing a filter.</p>
              <button className="btn-clear" onClick={clearAll} style={{ marginTop: 12 }}>Clear all filters</button>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </>
  )
}
