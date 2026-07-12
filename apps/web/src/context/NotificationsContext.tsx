import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { fetchMyVenues } from '../lib/venues'
import { listRequestsForVenues } from '../lib/bookings'
import type { Booking } from '../types'

interface NotificationsValue {
  count: number
  pending: Booking[]
  loading: boolean
  refresh: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [pending, setPending] = useState<Booking[]>([])
  const [venueIds, setVenueIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || !supabase) { setPending([]); setVenueIds([]); return }
    try {
      setLoading(true)
      const { data: mine, error: mineErr } = await fetchMyVenues(user.id)
      if (mineErr) throw mineErr
      const ids = (mine || []).map((v) => v.id)
      setVenueIds(ids)
      if (!ids.length) { setPending([]); return }
      const { data, error } = await listRequestsForVenues(ids)
      if (error) throw error
      setPending((data || []).filter((b) => b.status === 'requested'))
    } catch (e) {
      console.error('notifications refresh failed', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // Live bump when a guest requests one of this host's venues.
  // The subscription key is a stable string so the channel only tears down when
  // the actual set of venue IDs changes, not when a fresh array reference is
  // built during refresh().
  const venueIdsKey = venueIds.join(',')
  useEffect(() => {
    const sb = supabase
    if (!user || !sb || !venueIds.length) return
    const ch = sb
      .channel('host-new-bookings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        const b = payload.new as Booking | null
        if (b && venueIds.includes(b.venue_id) && b.status === 'requested') {
          setPending((cur) => (cur.some((x) => x.id === b.id) ? cur : [b, ...cur]))
        }
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, venueIdsKey])

  return (
    <NotificationsContext.Provider value={{ count: pending.length, pending, loading, refresh }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsValue {
  return useContext(NotificationsContext) || { count: 0, pending: [], loading: false, refresh: async () => {} }
}