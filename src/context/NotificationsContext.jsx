import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { fetchMyVenues } from '../lib/venues'
import { listRequestsForVenues } from '../lib/bookings'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [venueIds, setVenueIds] = useState([])

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) { setPending([]); setVenueIds([]); return }
    const { data: mine } = await fetchMyVenues(user.id)
    const ids = (mine || []).map((v) => v.id)
    setVenueIds(ids)
    if (!ids.length) { setPending([]); return }
    const { data } = await listRequestsForVenues(ids)
    setPending((data || []).filter((b) => b.status === 'requested'))
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // Live bump when a guest requests one of this host's venues.
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !venueIds.length) return
    const ch = supabase
      .channel('host-new-bookings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        const b = payload.new
        if (b && venueIds.includes(b.venue_id) && b.status === 'requested') {
          setPending((cur) => (cur.some((x) => x.id === b.id) ? cur : [b, ...cur]))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, venueIds])

  return (
    <NotificationsContext.Provider value={{ count: pending.length, pending, refresh }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext) || { count: 0, pending: [], refresh: () => {} }
}
