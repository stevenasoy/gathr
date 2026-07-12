import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Mode } from '../types'

interface ModeValue {
  mode: Mode
  setMode: (m: Mode) => void
}

// 'traveling' (guest) or 'hosting'. Persists so resources/logo stay in-context
// even on shared routes (e.g. /host-resources) that aren't under /host/.
const ModeContext = createContext<ModeValue | null>(null)
const KEY = 'gathr.mode'

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    try { return (localStorage.getItem(KEY) as Mode) || 'traveling' } catch { return 'traveling' }
  })
  const setMode = useCallback((m: Mode) => {
    setModeState(m)
    try { localStorage.setItem(KEY, m) } catch { /* ignore */ }
  }, [])
  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode(): ModeValue {
  return useContext(ModeContext) || { mode: 'traveling', setMode: () => {} }
}