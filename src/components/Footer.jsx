import { Link, useNavigate } from 'react-router-dom'
import { useMode } from '../context/ModeContext'

export default function Footer() {
  const { mode, setMode } = useMode()
  const navigate = useNavigate()
  const hosting = mode === 'hosting'

  const bookAsGatherer = () => { setMode('traveling'); navigate('/search') }

  return (
    <footer className="foot">
      <div className="foot-cta">
        <div className="wrap foot-cta-in">
          {hosting ? (
            <>
              <div>
                <h3>Planning a gathering of your own?</h3>
                <p>Switch over and book a venue for your next wedding, offsite, or celebration.</p>
              </div>
              <button onClick={bookAsGatherer}>Book a venue</button>
            </>
          ) : (
            <>
              <div>
                <h3>Have a space worth gathering in?</h3>
                <p>List it on Gathr and reach Gatherers planning their next wedding, offsite, or launch.</p>
              </div>
              <Link to="/host">
                <button>List your venue</button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="wrap foot-cols">
        <div className="foot-col foot-about">
          <Link to="/" className="logo"><span className="logo-mark">g</span>Gathr</Link>
          <p>The marketplace for event venues across the Philippines. Find the space, lock the date, host the moment.</p>
        </div>
        <div className="foot-col">
          <h4>Explore</h4>
          <Link to="/search?type=wedding">Weddings</Link>
          <Link to="/search?type=corporate">Corporate events</Link>
          <Link to="/search?type=party">Birthday parties</Link>
          <Link to="/search?type=workshop">Workshops</Link>
          <Link to="/search?type=studio">Photo studios</Link>
        </div>
        <div className="foot-col">
          <h4>For Hosts</h4>
          <Link to="/host">List your venue</Link>
          <Link to="/host-resources">Host resources</Link>
          <Link to="/pricing-guide">Pricing guide</Link>
          <Link to="/community">Community</Link>
        </div>
        <div className="foot-col">
          <h4>Company</h4>
          <Link to="/about">About</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/help">Support</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </div>

      <div className="wrap foot-bottom">
        <span>© 2026 Gathr. A concept demo.</span>
        <span className="foot-legal">
          <Link to="/privacy">Privacy</Link>
          <span className="foot-dot">·</span>
          <Link to="/terms">Terms</Link>
          <span className="foot-dot">·</span>
          <Link to="/sitemap">Sitemap</Link>
        </span>
      </div>
    </footer>
  )
}
