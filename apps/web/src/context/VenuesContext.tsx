import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { VENUES as SEED_VENUES } from '../data/venues'
import { fetchPublicVenues } from '../lib/venues'
import { fetchReviewStats } from '../lib/reviews'
import type { ReviewStat } from '../lib/reviews'
import type { Venue } from '../types'

interface VenuesValue {
  venues: Venue[]
  dbVenues: Venue[]
  loading: boolean
  findVenue: (id: string) => Venue | undefined
  refresh: () => Promise<void>
}

const VenuesContext = createContext<VenuesValue | null>(null)

export function VenuesProvider({ children }: { children: ReactNode }) {
  const [dbVenues, setDbVenues] = useState<Venue[]>([])
  const [stats, setStats] = useState<Record<string, ReviewStat>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const [rows, reviewStats] = await Promise.all([fetchPublicVenues(), fetchReviewStats()])
      setDbVenues(rows)
      setStats(reviewStats)
    } catch (e) {
      console.error('venues refresh failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Host listings get real review stats merged in (rating, count, badge drop).
  // Seed venues keep their curated sample numbers — they have no owner, so
  // their bookings can never be confirmed and never produce real reviews.
  // Memoized so venues/findVenue keep a stable identity between renders.
  const venues = useMemo(() => {
    const withStats = (v: Venue): Venue => {
      const s = v.isHostListing && stats[v.id]
      return s ? { ...v, rating: s.avg, reviews: s.count, badge: null } : v
    }
    // Host listings first (newest), then the curated seed catalog.
    return [...dbVenues.map(withStats), ...SEED_VENUES]
  }, [dbVenues, stats])

  const findVenue = useCallback(
    (id: string) => venues.find((v) => v.id === id),
    [venues],
  )

  return (
    <VenuesContext.Provider value={{ venues, dbVenues, loading, findVenue, refresh }}>
      {children}
    </VenuesContext.Provider>
  )
}

export function useVenues(): VenuesValue {
  const ctx = useContext(VenuesContext)
  if (!ctx) throw new Error('useVenues must be used inside <VenuesProvider>')
  return ctx
}