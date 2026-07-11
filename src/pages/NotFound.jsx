import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import Footer from '../components/Footer'

export default function NotFound() {
  return (
    <>
      <main className="wrap empty" style={{ paddingTop: 100, paddingBottom: 100, textAlign: 'center' }}>
        <MapPin size={40} style={{ color: 'var(--brand)', marginBottom: 14 }} />
        <h1 style={{ marginBottom: 8 }}>This page doesn't exist</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>
          The link may be old, or the venue may have been unlisted.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn-primary" style={{ display: 'inline-block' }}>Back to home</Link>
          <Link to="/search" className="btn-ghost" style={{ display: 'inline-block' }}>Browse venues</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
