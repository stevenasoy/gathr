import { useEffect } from 'react'

const BASE = 'Gathr — Venues for every gathering'

// Sets document.title to "<title> · Gathr", restoring the default on unmount.
// Pages with dynamic titles (venue name, booking) call this directly; static
// routes get theirs from RouteTitle in App.tsx.
export function usePageTitle(title: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} · Gathr` : BASE
    return () => { document.title = BASE }
  }, [title])
}

export const setRouteTitle = (title: string | null): void => {
  document.title = title ? `${title} · Gathr` : BASE
}