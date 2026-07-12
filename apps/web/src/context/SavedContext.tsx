import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { supabase, createUserSupabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const LS_KEY = 'gathr.saved'
const readLS = (): string[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as string[] } catch { return [] } }
const writeLS = (ids: string[]): void => { localStorage.setItem(LS_KEY, JSON.stringify(ids)) }

interface SavedIdsValue {
  ids: string[]
  loading: boolean
}

interface SavedMethodsValue {
  isSaved: (id: string) => boolean
  toggle: (venueId: string) => Promise<boolean>
}

const SavedIdsContext = createContext<SavedIdsValue | null>(null)
const SavedMethodsContext = createContext<SavedMethodsValue | null>(null)

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ids, setIds] = useState<string[]>(readLS)
  const [loading, setLoading] = useState(true)

  // Load saved venues whenever auth state changes.
  // Signed in: read from Supabase (and migrate any guest saves up once).
  // Signed out: read from localStorage.
  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        if (user && supabase) {
          const local = readLS()
          const sb = createUserSupabase()
          if (local.length) {
            await sb.from('saved_venues').upsert(
              local.map((venue_id) => ({ user_id: user.id, venue_id })),
              { onConflict: 'user_id,venue_id', ignoreDuplicates: true },
            )
            writeLS([])
          }
          const { data, error } = await sb.from('saved_venues').select('venue_id').eq('user_id', user.id)
          if (error) throw error
          if (active) setIds((data || []).map((r) => r.venue_id))
        } else {
          if (active) setIds(readLS())
        }
      } catch (e) {
        console.error('saved venues load failed', e)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user])

  const toggle = useCallback(async (venueId: string): Promise<boolean> => {
    const has = ids.includes(venueId)
    const next = has ? ids.filter((x) => x !== venueId) : [...ids, venueId]
    setIds(next) // optimistic
    if (user && supabase) {
      try {
        const sb = createUserSupabase()
        const res = has
          ? await sb.from('saved_venues').delete().eq('user_id', user.id).eq('venue_id', venueId)
          : await sb.from('saved_venues').upsert(
              { user_id: user.id, venue_id: venueId },
              { onConflict: 'user_id,venue_id', ignoreDuplicates: true },
            )
        if (res.error) throw res.error
      } catch (e) {
        console.error('saved toggle failed — rolling back', e)
        setIds(ids) // rollback to pre-toggle state
        return has // still considered "has" since the toggle failed
      }
    } else {
      try { writeLS(next) } catch { setIds(ids) }
    }
    return !has
  }, [ids, user])

  const isSaved = useCallback((id: string): boolean => ids.includes(id), [ids])

  const idsValue = useMemo(() => ({ ids, loading }), [ids, loading])
  const methodsValue = useMemo(() => ({ isSaved, toggle }), [isSaved, toggle])

  return (
    <SavedIdsContext.Provider value={idsValue}>
      <SavedMethodsContext.Provider value={methodsValue}>
        {children}
      </SavedMethodsContext.Provider>
    </SavedIdsContext.Provider>
  )
}

export function useSavedIds(): SavedIdsValue {
  const ctx = useContext(SavedIdsContext)
  if (!ctx) throw new Error('useSavedIds must be used inside <SavedProvider>')
  return ctx
}

export function useSavedMethods(): SavedMethodsValue {
  const ctx = useContext(SavedMethodsContext)
  if (!ctx) throw new Error('useSavedMethods must be used inside <SavedProvider>')
  return ctx
}

// Backward-compatible hook: returns both ids/loading and methods. Prefer the
// narrower hooks in list items so React can skip re-renders when only the id
// list changed.
export function useSaved(): SavedIdsValue & SavedMethodsValue {
  return { ...useSavedIds(), ...useSavedMethods() }
}
