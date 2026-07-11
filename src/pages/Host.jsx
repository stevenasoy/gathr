import { Link } from 'react-router-dom'
import { Wallet, Calendar, ListChecks, Zap, Tag, Search } from 'lucide-react'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'

const BENEFITS = [
  { icon: Wallet, title: 'Set your own price', body: 'You choose your hourly rate and which kinds of events you take. Change it anytime from your dashboard.' },
  { icon: ListChecks, title: 'Approve every booking', body: 'Each request comes to you with the date, guest count, and total. Confirm or decline. Nothing is locked until you say yes.' },
  { icon: Calendar, title: 'One Host dashboard', body: 'Pending requests, upcoming events, a month calendar, and your listings all live in one place.' },
  { icon: Zap, title: 'Live in minutes', body: 'List your venue yourself in a few short steps. It appears in Gathr search right away, no waitlist, no call.' },
  { icon: Tag, title: 'Free to list', body: 'Listing costs nothing. Gathr adds a service fee to the guest’s total when a booking is confirmed. No subscriptions.' },
  { icon: Search, title: 'Reach event planners', body: 'Your listing shows up for people planning weddings, offsites, parties, and shoots across the Philippines.' },
]

const FAQ = [
  { q: 'How much does it cost to list?', a: 'Nothing. Listing is free. Gathr adds a service fee to the guest’s booking total when a request is confirmed. There are no subscriptions or upfront fees.' },
  { q: 'How long until my listing is live?', a: 'Right away. You create the listing yourself in a few steps and it appears in search immediately. You can delete it anytime.' },
  { q: 'How do bookings work?', a: 'Guests send a request with their date, hours, and guest count. You review it in your dashboard and confirm or decline. Nothing is committed until you confirm.' },
  { q: 'Can I edit or remove my listing?', a: 'You can delete a listing anytime from your dashboard. In-place editing of listing details is on the way.' },
]

export default function Host() {
  const { user } = useAuth()
  const { dbVenues } = useVenues()
  const isHost = !!user && dbVenues.some((v) => v.ownerId === user.id)
  const primary = isHost
    ? { to: '/host/dashboard', label: 'Go to your dashboard' }
    : { to: '/host/new', label: 'List your venue' }

  return (
    <>
      <main>
        <section className="page-hero page-hero-grad">
          <div className="wrap">
            <span className="page-eyebrow">For Hosts</span>
            <h1>Turn your space into income.</h1>
            <p>List your rooftop, garden, hall, or studio on Gathr and reach people planning weddings, launches, and offsites across the Philippines.</p>
            <div className="cta-row" style={{ marginTop: 22 }}>
              <Link to={primary.to} className="btn-primary" style={{ display: 'inline-block', width: 'auto', padding: '14px 24px' }}>{primary.label}</Link>
              {isHost && <Link to="/pricing-guide" className="host-link" style={{ background: '#fff' }}>See pricing</Link>}
            </div>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <h2>Why Hosts choose Gathr</h2>
            <div className="content-grid">
              {BENEFITS.map((b) => (
                <div className="content-card" key={b.title}>
                  <div className="icon-pill"><b.icon size={20} /></div>
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Frequently asked</h2>
            <div className="faq-list">
              {FAQ.map((f) => (
                <details className="faq-item" key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <div className="banner-card">
              <div>
                <h3>Ready to list your space?</h3>
                <p>It takes a few minutes and goes live right away.</p>
              </div>
              <Link to={primary.to} className="btn-primary" style={{ width: 'auto', padding: '14px 26px', whiteSpace: 'nowrap' }}>{primary.label}</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
