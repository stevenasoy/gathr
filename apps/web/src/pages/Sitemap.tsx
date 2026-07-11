import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import { VENUES, CITIES } from '../data/venues'
import { CATEGORIES } from '../data/categories'

const SECTIONS = [
  {
    title: 'Browse',
    links: [
      { to: '/', label: 'Home' },
      { to: '/search', label: 'All venues' },
      { to: '/saved', label: 'Saved venues' },
      { to: '/bookings', label: 'Your bookings' },
    ],
  },
  {
    title: 'For Hosts',
    links: [
      { to: '/host', label: 'List your venue' },
      { to: '/host-resources', label: 'Host resources' },
      { to: '/pricing-guide', label: 'Pricing guide' },
      { to: '/community', label: 'Community' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/careers', label: 'Careers' },
      { to: '/help', label: 'Help center' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/signin', label: 'Sign in' },
      { to: '/signup', label: 'Create an account' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/terms', label: 'Terms of service' },
    ],
  },
]

export default function Sitemap() {
  return (
    <>
      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">Sitemap</span>
            <h1>Everything on Gathr</h1>
            <p>The full map of pages, event types, cities, and venues.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <div className="sitemap-grid">
            {SECTIONS.map((s) => (
              <div className="sitemap-col" key={s.title}>
                <h4>{s.title}</h4>
                {s.links.map((l) => (
                  <Link key={l.to} to={l.to}>{l.label}</Link>
                ))}
              </div>
            ))}

            <div className="sitemap-col">
              <h4>Event types</h4>
              {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <Link key={c.id} to={`/search?type=${c.id}`}>{c.label}</Link>
              ))}
            </div>

            <div className="sitemap-col">
              <h4>Cities</h4>
              {CITIES.map((c) => (
                <Link key={c} to={`/search?where=${encodeURIComponent(c)}`}>{c}</Link>
              ))}
            </div>

            <div className="sitemap-col sitemap-venues">
              <h4>All venues</h4>
              {VENUES.map((v) => (
                <Link key={v.id} to={`/venue/${v.id}`}>{v.name} <span style={{ color: 'var(--ink-faint)' }}>· {v.city}</span></Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
