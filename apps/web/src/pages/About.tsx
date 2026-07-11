import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

const STATS = [
  { n: '1.4K+', label: 'Venues listed' },
  { n: '12', label: 'Cities covered' },
  { n: '38K', label: 'Events hosted' },
  { n: '4.91', label: 'Average rating' },
]

const VALUES = [
  { title: 'Hosts first', body: 'When the host wins, the guest wins, and the platform wins. Every product decision starts there.' },
  { title: 'Transparent pricing', body: 'One fee, billed once. No surge surprises, no hidden surcharges, no "service" line items.' },
  { title: 'Build for the room', body: 'We don\'t copy global playbooks. Filipino weddings, brand launches, and offsites have their own rules — we build for those.' },
]

export default function About() {
  return (
    <>
      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">About</span>
            <h1>The marketplace built for Filipino events.</h1>
            <p>Gathr started in Cebu in 2024 — built by a small team who got tired of chasing event venues over Viber. We're now the home for hosts and bookers across the country.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <div className="stat-row">
              {STATS.map((s) => (
                <div className="stat" key={s.label}>
                  <b>{s.n}</b><span>{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>What we believe</h2>
            <div className="content-grid">
              {VALUES.map((v) => (
                <div className="content-card" key={v.title}>
                  <h3>{v.title}</h3>
                  <p>{v.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Where we work</h2>
            <p style={{ maxWidth: 720 }}>HQ is in Cebu. We also have hosts and ops people in Manila, Tagaytay, Bohol, Davao, and Baguio. If you'd like to host with us in a city we don't cover yet, <Link to="/contact" style={{ color: 'var(--brand)', fontWeight: 600 }}>let us know</Link>.</p>
          </section>

          <section>
            <div className="banner-card">
              <div>
                <h3>Want to work with us?</h3>
                <p>We hire across product, hosting ops, and growth.</p>
              </div>
              <Link to="/careers" className="btn-primary" style={{ width: 'auto', padding: '13px 22px' }}>See open roles</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
