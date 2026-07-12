import { useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Home, Search, MapPin, HelpCircle, Heart, LifeBuoy, CalendarCheck, Info, Briefcase, LogOut, Store, Sparkles, Bell, MessageSquare, CalendarDays, Plane, Plus, Inbox } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { useNotifications } from '../context/NotificationsContext'
import { useMode } from '../context/ModeContext'
import { useSaved } from '../context/SavedContext'

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, displayName, signOut } = useAuth()
  const { dbVenues } = useVenues()
  const { count } = useNotifications()
  const { mode, setMode } = useMode()
  const { ids } = useSaved()
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // A user becomes a host once they own at least one listing.
  const isHost = user ? dbVenues.some((v) => v.ownerId === user.id) : false
  // Hosting is a sticky mode: entering the workspace turns it on; "Switch to
  // traveling" turns it off. It persists across shared routes (resources, etc.).
  const hosting = mode === 'hosting'

  // Entering the host workspace puts you in hosting mode.
  useEffect(() => {
    if (pathname.startsWith('/host/')) setMode('hosting')
  }, [pathname, setMode])

  const initial = user ? (displayName?.[0] || user.email?.[0] || 'U').toUpperCase() : null

  const goTraveling = () => {
    setMode('traveling')
    closeAll()
    navigate('/')
  }

  const onSignOut = async () => {
    await signOut()
    setMode('traveling')
    closeAll()
    navigate('/')
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setDropdownOpen(false); } }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  useEffect(() => {
    const handleOutsideClick = () => setDropdownOpen(false)
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  const closeAll = () => { setOpen(false); setDropdownOpen(false) }
  const close = () => setOpen(false)

  const handleAvatarClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (window.innerWidth > 860) {
      setDropdownOpen((prev) => !prev)
    } else {
      setOpen(true)
    }
  }

  const goAnchor = (e: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    closeAll()
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
      <header className="sticky top-3 z-[100] w-[calc(100%-32px)] max-w-wrap mx-auto mb-4 backdrop-blur-[20px] border border-ink/[0.08] rounded-full shadow-bar transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ background: 'rgba(250, 249, 246, 0.85)' }}>
        <div className="max-w-wrap mx-auto flex items-center justify-between h-[60px] px-6 gap-6">
          <Link to={hosting ? '/host/dashboard' : '/'} className="flex items-center gap-2.5 font-outfit font-extrabold text-2xl tracking-[-0.03em] text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02]" aria-label="Gathr home" onClick={closeAll}>
            <span className="w-8 h-8 rounded-lg bg-brand grid place-items-center text-white text-[20px] font-bold font-display italic pb-[3px] shadow-[0_2px_8px_rgba(194,90,30,0.2)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-rotate-6 hover:scale-105">g</span>
            Gathr
          </Link>

          {hosting ? (
            <span className="font-outfit font-bold text-[15px] text-ink tracking-[-0.01em]">Hosting</span>
          ) : (
            <nav className="flex gap-1.5">
              <Link to="/search" className={`py-2 px-4 rounded-full font-semibold text-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${pathname === '/search' ? 'text-brand bg-brand/[0.08]' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>Venues</Link>
              <a href="/#how" onClick={(e) => goAnchor(e, 'how')} className="py-2 px-4 rounded-full font-semibold text-sm text-ink-soft transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint hover:text-ink">How it works</a>
              <a href="/#cities" onClick={(e) => goAnchor(e, 'cities')} className="py-2 px-4 rounded-full font-semibold text-sm text-ink-soft transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint hover:text-ink">Cities</a>
            </nav>
          )}

          <div className="flex items-center gap-2">
            {!hosting && (isHost
              ? <Link to="/host/dashboard" className="py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint">Host dashboard</Link>
              : <Link to="/host" className="py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint">Become a Host</Link>)}
            {!hosting && isHost && (
              <Link to="/host/dashboard" className="grid place-items-center w-[42px] p-0 py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint" aria-label={`${count} pending requests`} style={{ position: 'relative' }}>
                <Bell size={18} />
                {count > 0 && <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand-2 text-white text-[10px] font-bold grid place-items-center">{count}</span>}
              </Link>
            )}
            {!hosting && (
              <Link to="/saved" className="grid place-items-center w-[42px] p-0 py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint" aria-label={`${ids.length} saved venues`} style={{ position: 'relative' }}>
                <Heart size={18} />
                {ids.length > 0 && <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center">{ids.length}</span>}
              </Link>
            )}
            <div style={{ position: 'relative' }}>
              <button className="flex items-center gap-2.5 py-[5px] pr-1.5 pl-3 border border-line-strong rounded-full bg-surface transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer hover:border-brand hover:shadow-[0_4px_12px_rgba(194,90,30,0.1)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" aria-label="Open menu" onClick={handleAvatarClick}>
                <Menu size={16} />
                <span className="w-[30px] h-[30px] rounded-full bg-brand text-white grid place-items-center font-bold text-[13px] shadow-[0_2px_6px_rgba(194,90,30,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105" style={{ background: user ? 'var(--brand)' : 'var(--ink-soft)' }}>
                  {user ? (
                    initial
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute top-12 right-0 z-[200] w-60 bg-white/[0.85] backdrop-blur-2xl border border-ink/[0.08] rounded-2xl shadow-[0_10px_30px_rgba(18,16,22,0.08)] py-2" style={{ animation: 'dropdown-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards', transformOrigin: 'top right' }} onClick={(e) => e.stopPropagation()}>
                  {user ? (
                    hosting ? (
                      <>
                        <div style={{ padding: '12px 18px 8px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>HOSTING</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{displayName}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</div>
                        </div>
                        <div className="h-px bg-line my-1.5" />
                        <Link to="/host/dashboard?tab=today" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Dashboard</Link>
                        <Link to="/host/new" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Add a venue</Link>
                        <Link to="/host-resources" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Host resources</Link>
                        <Link to="/pricing-guide" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Pricing guide</Link>
                        <div className="h-px bg-line my-1.5" />
                        <button onClick={goTraveling} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer text-brand hover:bg-tint">Switch to gathering</button>
                        <div className="h-px bg-line my-1.5" />
                        <button onClick={onSignOut} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Sign out</button>
                      </>
                    ) : (
                      <>
                        <div style={{ padding: '12px 18px 8px' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{displayName}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</div>
                        </div>
                        <div className="h-px bg-line my-1.5" />
                        <Link to="/bookings" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Your bookings</Link>
                        <Link to="/saved" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Saved venues</Link>
                        <Link to="/messages" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Messages</Link>
                        <div className="h-px bg-line my-1.5" />
                        {isHost ? (
                          <Link to="/host/dashboard" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Host dashboard</Link>
                        ) : (
                          <Link to="/host" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Become a Host</Link>
                        )}
                        <div className="h-px bg-line my-1.5" />
                        <Link to="/help" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Help center</Link>
                        <button onClick={onSignOut} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Sign out</button>
                      </>
                    )
                  ) : (
                    <>
                      <Link to="/signin" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer text-brand hover:bg-tint" style={{ fontWeight: 700 }}>Sign in</Link>
                      <Link to="/signup" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Create an account</Link>
                      <div className="h-px bg-line my-1.5" />
                      <Link to="/host" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Become a Host</Link>
                      <Link to="/help" onClick={closeAll} className="block w-full py-2.5 px-[18px] text-sm font-semibold text-ink-soft text-left bg-transparent border-0 transition-colors duration-150 cursor-pointer hover:bg-tint hover:text-ink">Help center</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 bg-[rgba(24,18,37,0.42)] transition-opacity duration-[250ms] z-[90] ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={close} />
      <aside className={`fixed top-0 right-0 bottom-0 w-[min(360px,92vw)] bg-surface shadow-pop z-[100] flex flex-col py-[18px] px-[22px] pb-[22px] transition-transform duration-[280ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!open}>
        <div className="flex items-center justify-between pb-3.5 border-b border-line">
          <Link to={hosting ? '/host/dashboard' : '/'} onClick={close} className="flex items-center gap-2.5 font-outfit font-extrabold text-2xl tracking-[-0.03em] text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02]">
            <span className="w-8 h-8 rounded-lg bg-brand grid place-items-center text-white text-[20px] font-bold font-display italic pb-[3px] shadow-[0_2px_8px_rgba(194,90,30,0.2)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-rotate-6 hover:scale-105">g</span>
            Gathr
          </Link>
          <button className="w-9 h-9 rounded-full grid place-items-center text-ink-soft transition-colors duration-150 hover:bg-tint hover:text-ink" aria-label="Close menu" onClick={close}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {hosting ? (
            <>
              {/* Host-mode menu */}
              <div className="py-4 pt-1 border-b border-line">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1.5">Hosting</span>
                <Link to="/host/dashboard?tab=today" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><CalendarCheck size={18} /> Today</Link>
                <Link to="/host/dashboard?tab=calendar" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><CalendarDays size={18} /> Calendar</Link>
                <Link to="/host/dashboard?tab=bookings" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Inbox size={18} /> Bookings</Link>
                <Link to="/host/dashboard?tab=listings" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Store size={18} /> Listings</Link>
                <Link to="/host/dashboard?tab=messages" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><MessageSquare size={18} /> Messages</Link>
                <Link to="/host/new" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Plus size={18} /> Add a venue</Link>
              </div>

              <div className="py-4 pt-1 border-b border-line">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1.5">Resources</span>
                <Link to="/host-resources" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Briefcase size={18} /> Host resources</Link>
                <Link to="/pricing-guide" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Info size={18} /> Pricing guide</Link>
                <Link to="/help" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><LifeBuoy size={18} /> Help center</Link>
              </div>

              <div className="py-4 pt-1 border-b border-line">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1.5">Switch</span>
                <button onClick={goTraveling} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand w-full text-left bg-transparent" style={{ textAlign: 'left', background: 'none' }}><Plane size={18} /> Switch to gathering</button>
              </div>
            </>
          ) : (
            <>
              {/* Guest / booker menu */}
              <div className="py-4 pt-1 border-b border-line">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1.5">Explore</span>
                <Link to="/" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Home size={18} /> Home</Link>
                <Link to="/search" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Search size={18} /> All venues</Link>
                <a href="/#how" onClick={(e) => goAnchor(e, 'how')} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><HelpCircle size={18} /> How it works</a>
                <a href="/#cities" onClick={(e) => goAnchor(e, 'cities')} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><MapPin size={18} /> Cities</a>
              </div>

              <div className="py-4 pt-1 border-b border-line">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1.5">For you</span>
                <Link to="/saved" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Heart size={18} /> Saved venues</Link>
                <Link to="/bookings" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><CalendarCheck size={18} /> Your bookings</Link>
                <Link to="/messages" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><MessageSquare size={18} /> Messages</Link>
              </div>

              <div className="py-4 pt-1 border-b border-line">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1.5">Your venue</span>
                {isHost ? (
                  <Link to="/host/dashboard" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Store size={18} /> Host dashboard</Link>
                ) : (
                  <Link to="/host" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Sparkles size={18} /> Become a Host</Link>
                )}
              </div>

              <div className="py-4 pt-1 border-b border-line">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint mb-1.5">Support</span>
                <Link to="/help" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><LifeBuoy size={18} /> Help center</Link>
                <Link to="/contact" onClick={close} className="flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-[10px] text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-tint hover:text-brand"><Info size={18} /> Contact</Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-line">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-3.5">
                <span className="w-10 h-10 rounded-full bg-brand text-white grid place-items-center font-bold text-base">{initial}</span>
                <div>
                  <b>{displayName}</b>
                  <span className="block text-center text-[13px] text-ink-soft m-0">{user.email}</span>
                </div>
              </div>
              <button onClick={onSignOut} className="w-full py-[13px] px-4 rounded-xl border border-line-strong bg-white font-semibold text-[15px] text-ink transition-colors duration-150 hover:bg-tint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" onClick={close} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ display: 'block', textAlign: 'center' }}>Sign in</Link>
              <p className="text-center text-[13px] text-ink-soft mt-3">New to Gathr? <Link to="/signup" onClick={close} className="text-brand font-semibold hover:underline">Create an account</Link></p>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
