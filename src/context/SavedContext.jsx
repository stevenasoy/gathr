import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

const LS_KEY = 'gathr.saved'
const readLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const writeLS = (ids) => localStorage.setItem(LS_KEY, JSON.stringify(ids))

const SavedContext = createContext(null)

export function SavedProvider({ children }) {
  const { user } = useAuth()
  const [ids, setIds] = useState(readLS)
  const [loading, setLoading] = useState(true)

  // Load saved venues whenever auth state changes.
  // Signed in: read from Supabase (and migrate any guest saves up once).
  // Signed out: read from localStorage.
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      if (user && isSupabaseConfigured) {
        const local = readLS()
        if (local.length) {
          await supabase.from('saved_venues').upsert(
            local.map((venue_id) => ({ user_id: user.id, venue_id })),
            { onConflict: 'user_id,venue_id', ignoreDuplicates: true },
          )
          writeLS([])
        }
        const { data } = await supabase.from('saved_venues').select('venue_id').eq('user_id', user.id)
        if (active) setIds((data || []).map((r) => r.venue_id))
      } else {
        if (active) setIds(readLS())
      }
      if (active) setLoading(false)
    }
    load()
    return () => { active = false }
  }, [user])

  const toggle = useCallback(async (venueId) => {
    const has = ids.includes(venueId)
    const next = has ? ids.filter((x) => x !== venueId) : [...ids, venueId]
    setIds(next) // optimistic
    if (user && isSupabaseConfigured) {
      if (has) {
        await supabase.from('saved_venues').delete().eq('user_id', user.id).eq('venue_id', venueId)
      } else {
        await supabase.from('saved_venues').upsert(
          { user_id: user.id, venue_id: venueId },
          { onConflict: 'user_id,venue_id', ignoreDuplicates: true },
        )
      }
    } else {
      writeLS(next)
    }
    return !has
  }, [ids, user])

  const isSaved = useCallback((id) => ids.includes(id), [ids])

  return (
    <SavedContext.Provider value={{ ids, isSaved, toggle, loading }}>
      {children}
    </SavedContext.Provider>
  )
}

export function useSaved() {
  const ctx = useContext(SavedContext)
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>')
  return ctx
}
