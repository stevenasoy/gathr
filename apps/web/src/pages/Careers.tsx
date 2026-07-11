import { Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import Footer from '../components/Footer'

export default function Careers() {
  return (
    <>
      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">Careers</span>
            <h1>Build the home for Filipino events.</h1>
            <p>We're a small team in Cebu and Manila. We're not hiring at the moment, but we keep this page updated when that changes.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <div className="empty-state">
            <Briefcase size={40} strokeWidth={1.5} />
            <h2>No open roles right now</h2>
            <p>We don't have any positions open today. If you think you'd be a fit for the team down the line, send us a note and we'll keep you in mind when we start hiring.</p>
            <Link to="/contact" className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Get in touch</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
