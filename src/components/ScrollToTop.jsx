import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router keeps the window scroll position across navigations, so
// clicking a venue card from a scrolled page used to land mid-page.
// Hash links (/#how, /#cities) are left alone — Home handles those.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
