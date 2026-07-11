import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import { setRouteTitle } from './lib/title'

// Home is eager (first paint); everything else loads on demand so the
// homepage doesn't ship the host workspace, wizard, and messaging code.
const Search = lazy(() => import('./pages/Search'))
const Venue = lazy(() => import('./pages/Venue'))
const Host = lazy(() => import('./pages/Host'))
const HostDashboard = lazy(() => import('./pages/HostDashboard'))
const HostNew = lazy(() => import('./pages/HostNew'))
const HostEdit = lazy(() => import('./pages/HostEdit'))
const Messages = lazy(() => import('./pages/Messages'))
const HostResources = lazy(() => import('./pages/HostResources'))
const PricingGuide = lazy(() => import('./pages/PricingGuide'))
const Community = lazy(() => import('./pages/Community'))
const Help = lazy(() => import('./pages/Help'))
const About = lazy(() => import('./pages/About'))
const Careers = lazy(() => import('./pages/Careers'))
const Contact = lazy(() => import('./pages/Contact'))
const Saved = lazy(() => import('./pages/Saved'))
const Bookings = lazy(() => import('./pages/Bookings'))
const BookingDetail = lazy(() => import('./pages/BookingDetail'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Legal = lazy(() => import('./pages/Legal'))
const Sitemap = lazy(() => import('./pages/Sitemap'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Static route titles. Dynamic pages (venue, booking detail) override these
// via usePageTitle, which runs after this effect in the same commit.
const TITLES = [
  ['/search', 'Search venues'],
  ['/host/dashboard', 'Host dashboard'],
  ['/host/new', 'List your venue'],
  ['/host/edit', 'Edit listing'],
  ['/host-resources', 'Host resources'],
  ['/host', 'Become a Host'],
  ['/messages', 'Messages'],
  ['/pricing-guide', 'Pricing guide'],
  ['/community', 'Community'],
  ['/help', 'Help center'],
  ['/about', 'About'],
  ['/careers', 'Careers'],
  ['/contact', 'Contact'],
  ['/saved', 'Saved venues'],
  ['/bookings', 'Your bookings'],
  ['/signin', 'Sign in'],
  ['/signup', 'Create an account'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/sitemap', 'Sitemap'],
  ['/venue', 'Venue'],
]

function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname === '/') { setRouteTitle(null); return }
    const hit = TITLES.find(([p]) => pathname === p || pathname.startsWith(p + '/'))
    setRouteTitle(hit ? hit[1] : 'Page not found')
  }, [pathname])
  return null
}

const Loading = () => (
  <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
    Loading…
  </div>
)

export default function App() {
  return (
    <>
      <RouteTitle />
      <ScrollToTop />
      <Header />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/venue/:id" element={<Venue />} />
          <Route path="/host" element={<Host />} />
          <Route path="/host/dashboard" element={<HostDashboard />} />
          <Route path="/host/new" element={<HostNew />} />
          <Route path="/host/edit/:id" element={<HostEdit />} />
          <Route path="/messages" element={<Messages role="guest" />} />
          <Route path="/host-resources" element={<HostResources />} />
          <Route path="/pricing-guide" element={<PricingGuide />} />
          <Route path="/community" element={<Community />} />
          <Route path="/help" element={<Help />} />
          <Route path="/about" element={<About />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/privacy" element={<Legal />} />
          <Route path="/terms" element={<Legal />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
