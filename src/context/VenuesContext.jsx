import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { VENUES as SEED_VENUES } from '../data/venues'
import { fetchPublicVenues } from '../lib/venues'
import { fetchReviewStats } from '../lib/reviews'

const VenuesContext = createContext(null)

export function VenuesProvider({ children }) {
  const [dbVenues, setDbVenues] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [rows, reviewStats] = await Promise.all([fetchPublicVenues(), fetchReviewStats()])
    setDbVenues(rows)
    setStats(reviewStats)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Host listings get real review stats merged in (rating, count, badge drop).
  // Seed venues keep their curated sample numbers — they have no owner, so
  // their bookings can never be confirmed and never produce real reviews.
  // Memoized so venues/findVenue keep a stable identity between renders.
  const venues = useMemo(() => {
    const withStats = (v) => {
      const s = v.isHostListing && stats[v.id]
      return s ? { ...v, rating: s.avg, reviews: s.count, badge: null } : v
    }
    // Host listings first (newest), then the curated seed catalog.
    return [...dbVenues.map(withStats), ...SEED_VENUES]
  }, [dbVenues, stats])

  const findVenue = useCallback(
    (id) => venues.find((v) => v.id === id),
    [venues],
  )

  return (
    <VenuesContext.Provider value={{ venues, dbVenues, loading, findVenue, refresh }}>
      {children}
    </VenuesContext.Provider>
  )
}

export function useVenues() {
  const ctx = useContext(VenuesContext)
  if (!ctx) throw new Error('useVenues must be used inside <VenuesProvider>')
  return ctx
}
