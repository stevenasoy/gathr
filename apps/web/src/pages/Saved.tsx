import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import VenueCard from '../components/VenueCard'
import Footer from '../components/Footer'
import { useSaved } from '../context/SavedContext'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'

export default function Saved() {
  const { ids, loading } = useSaved()
  const { user } = useAuth()
  const { venues } = useVenues()
  const saved = venues.filter((v) => ids.includes(v.id))

  return (
    <>
      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">Your account</span>
            <h1>Saved venues</h1>
            <p>
              {saved.length
                ? `${saved.length} venue${saved.length > 1 ? 's' : ''} saved${user ? ' to your account.' : ' on this device.'}`
                : 'Tap the heart on any venue to save it here.'}
            </p>
          </div>
        </section>

        <div className="wrap page-body">
          {loading ? (
            <div className="empty-state"><p>Loading your saved venues…</p></div>
          ) : saved.length ? (
            <div className="grid">
              {saved.map((v) => <VenueCard key={v.id} venue={v} />)}
            </div>
          ) : (
            <div className="empty-state">
              <Heart size={40} strokeWidth={1.5} />
              <h2>No saved venues yet</h2>
              <p>Browse venues and tap the heart icon to keep a shortlist.{user ? ' It syncs to your account across devices.' : ' Sign in to keep it across devices.'}</p>
              <Link to="/search" className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Browse venues</Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
