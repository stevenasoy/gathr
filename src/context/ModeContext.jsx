import { createContext, useContext, useState, useCallback } from 'react'

// 'traveling' (guest) or 'hosting'. Persists so resources/logo stay in-context
// even on shared routes (e.g. /host-resources) that aren't under /host/.
const ModeContext = createContext(null)
const KEY = 'gathr.mode'

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(KEY) || 'traveling' } catch { return 'traveling' }
  })
  const setMode = useCallback((m) => {
    setModeState(m)
    try { localStorage.setItem(KEY, m) } catch { /* ignore */ }
  }, [])
  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode() {
  return useContext(ModeContext) || { mode: 'traveling', setMode: () => {} }
}
