import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Home, Search, MapPin, HelpCircle, Heart, Building2, LifeBuoy, CalendarCheck, Info, Briefcase, LogOut, Store, Sparkles, Bell, MessageSquare, CalendarDays, Plane, Plus, Inbox } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { useNotifications } from '../context/NotificationsContext'
import { useMode } from '../context/ModeContext'

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, displayName, signOut } = useAuth()
  const { dbVenues } = useVenues()
  const { count } = useNotifications()
  const { mode, setMode } = useMode()
  const [open, setOpen] = useState(false)

  // A user becomes a host once they own at least one listing.
  const isHost = !!user && dbVenues.some((v) => v.ownerId === user.id)
  // Hosting is a sticky mode: entering the workspace turns it on; "Switch to
  // traveling" turns it off. It persists across shared routes (resources, etc.).
  const hosting = mode === 'hosting'

  // Entering the host workspace puts you in hosting mode.
  useEffect(() => {
    if (pathname.startsWith('/host/')) setMode('hosting')
  }, [pathname, setMode])

  const initial = (displayName?.[0] || 'G').toUpperCase()

  const goTraveling = () => {
    setMode('traveling')
    close()
    navigate('/')
  }

  const onSignOut = async () => {
    await signOut()
    setMode('traveling')
    close()
    navigate('/')
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  const close = () => setOpen(false)

  const goAnchor = (e, id) => {
    e.preventDefault()
    close()
    if (pathname === '/') {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `#${id}`)
    } else {
      navigate(`/#${id}`)
    }
  }

  return (
    <>
      <header className="hdr">
        <div className="wrap hdr-row">
          <Link to={hosting ? '/host/dashboard' : '/'} className="logo" aria-label="Gathr home">
            <span className="logo-mark">g</span>
            Gathr
          </Link>

          {hosting ? (
            <span className="hdr-mode">Hosting</span>
          ) : (
            <nav className="hdr-mid">
              <Link to="/search" className={pathname === '/search' ? 'on' : ''}>Venues</Link>
              <a href="/#how" onClick={(e) => goAnchor(e, 'how')}>How it works</a>
              <a href="/#cities" onClick={(e) => goAnchor(e, 'cities')}>Cities</a>
            </nav>
          )}

          <div className="hdr-right">
            {!hosting && (isHost
              ? <Link to="/host/dashboard" className="host-link">Host dashboard</Link>
              : <Link to="/host" className="host-link">Become a Host</Link>)}
            {!hosting && isHost && (
              <Link to="/host/dashboard" className="host-link icon-btn" aria-label={`${count} pending requests`} style={{ position: 'relative' }}>
                <Bell size={18} />
                {count > 0 && <span className="notif-badge">{count}</span>}
              </Link>
            )}
            {!hosting && (
              <Link to="/saved" className="host-link icon-btn" aria-label="Saved venues">
                <Heart size={18} />
              </Link>
            )}
            <button className="avatar" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu size={16} />
              <span className="avatar-dot">{initial}</span>
            </button>
          </div>
        </div>
      </header>

      <div className={'drawer-scrim' + (open ? ' on' : '')} onClick={close} />
      <aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open}>
        <div className="drawer-head">
          <Link to={hosting ? '/host/dashboard' : '/'} onClick={close} className="logo"><span className="logo-mark">g</span>Gathr</Link>
          <button className="drawer-close" aria-label="Close menu" onClick={close}>
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {hosting ? (
            <>
              {/* Host-mode menu */}
              <div className="drawer-section">
                <span className="drawer-label">Hosting</span>
                <Link to="/host/dashboard?tab=today" onClick={close} className="drawer-link"><CalendarCheck size={18} /> Today</Link>
                <Link to="/host/dashboard?tab=calendar" onClick={close} className="drawer-link"><CalendarDays size={18} /> Calendar</Link>
                <Link to="/host/dashboard?tab=bookings" onClick={close} className="drawer-link"><Inbox size={18} /> Bookings</Link>
                <Link to="/host/dashboard?tab=listings" onClick={close} className="drawer-link"><Store size={18} /> Listings</Link>
                <Link to="/host/dashboard?tab=messages" onClick={close} className="drawer-link"><MessageSquare size={18} /> Messages</Link>
                <Link to="/host/new" onClick={close} className="drawer-link"><Plus size={18} /> Add a venue</Link>
              </div>

              <div className="drawer-section">
                <span className="drawer-label">Resources</span>
                <Link to="/host-resources" onClick={close} className="drawer-link"><Briefcase size={18} /> Host resources</Link>
                <Link to="/pricing-guide" onClick={close} className="drawer-link"><Info size={18} /> Pricing guide</Link>
                <Link to="/help" onClick={close} className="drawer-link"><LifeBuoy size={18} /> Help center</Link>
              </div>

              <div className="drawer-section">
                <span className="drawer-label">Switch</span>
                <button onClick={goTraveling} className="drawer-link" style={{ width: '100%', textAlign: 'left', background: 'none' }}><Plane size={18} /> Switch to gathering</button>
              </div>
            </>
          ) : (
            <>
              {/* Guest / booker menu */}
              <div className="drawer-section">
                <span className="drawer-label">Explore</span>
                <Link to="/" onClick={close} className="drawer-link"><Home size={18} /> Home</Link>
                <Link to="/search" onClick={close} className="drawer-link"><Search size={18} /> All venues</Link>
                <a href="/#how" onClick={(e) => goAnchor(e, 'how')} className="drawer-link"><HelpCircle size={18} /> How it works</a>
                <a href="/#cities" onClick={(e) => goAnchor(e, 'cities')} className="drawer-link"><MapPin size={18} /> Cities</a>
              </div>

              <div className="drawer-section">
                <span className="drawer-label">For you</span>
                <Link to="/saved" onClick={close} className="drawer-link"><Heart size={18} /> Saved venues</Link>
                <Link to="/bookings" onClick={close} className="drawer-link"><CalendarCheck size={18} /> Your bookings</Link>
                <Link to="/messages" onClick={close} className="drawer-link"><MessageSquare size={18} /> Messages</Link>
              </div>

              <div className="drawer-section">
                <span className="drawer-label">Your venue</span>
                {isHost ? (
                  <Link to="/host/dashboard" onClick={close} className="drawer-link"><Store size={18} /> Host dashboard</Link>
                ) : (
                  <Link to="/host" onClick={close} className="drawer-link"><Sparkles size={18} /> Become a Host</Link>
                )}
              </div>

              <div className="drawer-section">
                <span className="drawer-label">Support</span>
                <Link to="/help" onClick={close} className="drawer-link"><LifeBuoy size={18} /> Help center</Link>
                <Link to="/contact" onClick={close} className="drawer-link"><Info size={18} /> Contact</Link>
              </div>
            </>
          )}
        </div>

        <div className="drawer-foot">
          {user ? (
            <>
              <div className="drawer-account">
                <span className="avatar-dot">{initial}</span>
                <div>
                  <b>{displayName}</b>
                  <span className="drawer-note" style={{ margin: 0 }}>{user.email}</span>
                </div>
              </div>
              <button onClick={onSignOut} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" onClick={close} className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>Sign in</Link>
              <p className="drawer-note">New to Gathr? <Link to="/signup" onClick={close}>Create an account</Link></p>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
