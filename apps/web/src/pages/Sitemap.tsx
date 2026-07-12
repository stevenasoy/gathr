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
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="wrap relative z-[1]">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Sitemap</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Everything on Gathr</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">The full map of pages, event types, cities, and venues.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <div className="grid grid-cols-4 gap-x-6 gap-y-8">
            {SECTIONS.map((s) => (
              <div key={s.title}>
                <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink mb-3.5">{s.title}</h4>
                {s.links.map((l) => (
                  <Link key={l.to} to={l.to} className="block text-ink-soft text-sm py-1 hover:text-brand">{l.label}</Link>
                ))}
              </div>
            ))}

            <div>
              <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink mb-3.5">Event types</h4>
              {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <Link key={c.id} to={`/search?type=${c.id}`} className="block text-ink-soft text-sm py-1 hover:text-brand">{c.label}</Link>
              ))}
            </div>

            <div>
              <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink mb-3.5">Cities</h4>
              {CITIES.map((c) => (
                <Link key={c} to={`/search?where=${encodeURIComponent(c)}`} className="block text-ink-soft text-sm py-1 hover:text-brand">{c}</Link>
              ))}
            </div>

            <div className="col-span-2">
              <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink mb-3.5">All venues</h4>
              {VENUES.map((v) => (
                <Link key={v.id} to={`/venue/${v.id}`} className="block text-ink-soft text-sm py-1 hover:text-brand">
                  {v.name} <span className="text-ink-faint">· {v.city}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
