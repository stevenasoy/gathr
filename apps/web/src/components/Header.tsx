import { useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Home, Search, MapPin, HelpCircle, Heart, LifeBuoy, CalendarCheck, Info, Briefcase, LogOut, Store, Sparkles, Bell, MessageSquare, CalendarDays, Plane, Plus, Inbox, LogIn, UserPlus, ArrowLeftRight, Compass } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'
import { useNotifications } from '../context/NotificationsContext'
import { useMode } from '../context/ModeContext'
import { useSaved } from '../context/SavedContext'
import { Drawer } from './Drawer'

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
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setDropdownOpen(false) }
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
    // Defer scroll/navigation to allow the Radix Dialog/Drawer
    // to close completely and unlock body scroll.
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        window.history.replaceState(null, '', `#${id}`)
      } else {
        navigate({ pathname: '/', hash: `#${id}` })
      }
    }, 200)
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
            <nav className="hidden min-[860px]:flex min-[860px]:gap-1.5">
              <Link to="/search" className={`py-2 px-4 rounded-full font-semibold text-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${pathname === '/search' ? 'text-brand bg-brand/[0.08]' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>Venues</Link>
              <a href="/#how" onClick={(e) => goAnchor(e, 'how')} className="py-2 px-4 rounded-full font-semibold text-sm text-ink-soft transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint hover:text-ink">How it works</a>
              <a href="/#cities" onClick={(e) => goAnchor(e, 'cities')} className="py-2 px-4 rounded-full font-semibold text-sm text-ink-soft transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint hover:text-ink">Cities</a>
            </nav>
          )}

          <div className="flex items-center gap-2">
            {!hosting && (isHost
              ? <Link to="/host/dashboard" className="hidden min-[860px]:inline-block py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint">Host dashboard</Link>
              : <Link to="/host" className="hidden min-[860px]:inline-block py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint">Become a Host</Link>)}
            {!hosting && isHost && (
              <Link to="/host/dashboard" className="hidden min-[860px]:grid place-items-center w-[42px] p-0 py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint" aria-label={`${count} pending requests`} style={{ position: 'relative' }}>
                <Bell size={18} />
                {count > 0 && <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand-2 text-white text-[10px] font-bold grid place-items-center">{count}</span>}
              </Link>
            )}
            {!hosting && (
              <Link to="/saved" className="hidden min-[860px]:grid place-items-center w-[42px] p-0 py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint" aria-label={`${ids.length} saved venues`} style={{ position: 'relative' }}>
                <Heart size={18} />
                {ids.length > 0 && <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand text-white text-[10px] font-bold grid place-items-center">{ids.length}</span>}
              </Link>
            )}
            <div style={{ position: 'relative' }}>
              {/* Unified circular trigger button for Desktop and Mobile */}
              <button
                className={`flex items-center justify-center w-10 h-10 border rounded-full bg-surface transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer hover:border-brand hover:shadow-[0_4px_12px_rgba(194,90,30,0.1)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] ${
                  dropdownOpen
                    ? 'border-brand shadow-[0_4px_12px_rgba(194,90,30,0.1)] ring-2 ring-brand/10'
                    : 'border-line-strong'
                }`}
                aria-label={user ? 'Open profile menu' : 'Open menu'}
                onClick={handleAvatarClick}
              >
                {user ? (
                  /* Shows only the avatar bubble when logged in */
                  <span className="w-[30px] h-[30px] rounded-full bg-brand text-white grid place-items-center font-bold text-[13px] shadow-[0_2px_6px_rgba(194,90,30,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105">
                    {initial}
                  </span>
                ) : (
                  /* Shows only the sleek hamburger icon when logged out */
                  <Menu size={18} className="text-ink-soft" />
                )}
              </button>

              {dropdownOpen && (
                <div
                  className="absolute top-12 right-0 z-[200] w-64 bg-white/95 backdrop-blur-xl border border-ink/[0.08] rounded-2xl shadow-[0_12px_36px_rgba(18,16,22,0.12),0_2px_8px_rgba(18,16,22,0.04)] py-2.5 transition-all duration-300"
                  style={{ animation: 'dropdown-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards', transformOrigin: 'top right' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {user ? (
                    hosting ? (
                      <>
                        {/* Host mode dropdown header */}
                        <div className="px-4 py-3 mx-2 mb-2 rounded-xl bg-tint/40 border border-ink/[0.03] flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-brand-2 text-white grid place-items-center font-bold text-[13px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]">
                            {initial}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-outfit font-bold text-sm text-ink truncate">{displayName}</span>
                              <span className="bg-brand-2/10 text-brand-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Host</span>
                            </div>
                            <div className="text-[11px] text-ink-soft truncate">{user.email}</div>
                          </div>
                        </div>
                        
                        <div className="h-px bg-line/60 my-1 mx-2" />

                        {/* Host actions */}
                        <Link to="/host/dashboard?tab=today" onClick={closeAll} className={`mx-2 px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-150 ${pathname === '/host/dashboard' ? 'text-brand-2 bg-brand-2/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                          <CalendarCheck size={16} className="opacity-80" /> Dashboard
                        </Link>
                        <Link to="/host/new" onClick={closeAll} className="mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink flex items-center gap-3 transition-all duration-150">
                          <Plus size={16} className="opacity-80" /> Add a venue
                        </Link>
                        <Link to="/host-resources" onClick={closeAll} className="mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink flex items-center gap-3 transition-all duration-150">
                          <Briefcase size={16} className="opacity-80" /> Host resources
                        </Link>
                        <Link to="/pricing-guide" onClick={closeAll} className="mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink flex items-center gap-3 transition-all duration-150">
                          <Info size={16} className="opacity-80" /> Pricing guide
                        </Link>

                        <div className="h-px bg-line/60 my-1.5 mx-2" />

                        {/* Switch Mode Button */}
                        <button onClick={goTraveling} className="w-[calc(100%-16px)] mx-2 px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between text-brand bg-brand/5 hover:bg-brand/10 transition-all duration-150 active:scale-[0.98]">
                          <span className="flex items-center gap-2.5">
                            <ArrowLeftRight size={15} /> Switch to gathering
                          </span>
                        </button>

                        <div className="h-px bg-line/60 my-1.5 mx-2" />

                        <button onClick={onSignOut} className="w-[calc(100%-16px)] mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-left text-ink-soft hover:bg-red-50 hover:text-red-600 flex items-center gap-3 transition-all duration-150">
                          <LogOut size={16} className="opacity-80" /> Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Guest mode dropdown header */}
                        <div className="px-4 py-3 mx-2 mb-2 rounded-xl bg-tint/40 border border-ink/[0.03] flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center font-bold text-[13px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]">
                            {initial}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-outfit font-bold text-sm text-ink truncate">{displayName}</span>
                              <span className="bg-brand/10 text-brand text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Guest</span>
                            </div>
                            <div className="text-[11px] text-ink-soft truncate">{user.email}</div>
                          </div>
                        </div>

                        <div className="h-px bg-line/60 my-1 mx-2" />

                        {/* Guest actions */}
                        <Link to="/bookings" onClick={closeAll} className={`mx-2 px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-150 ${pathname === '/bookings' ? 'text-brand bg-brand/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                          <CalendarCheck size={16} className="opacity-80" /> Your bookings
                        </Link>
                        <Link to="/saved" onClick={closeAll} className={`mx-2 px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-150 ${pathname === '/saved' ? 'text-brand bg-brand/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                          <Heart size={16} className="opacity-80" /> Saved venues
                        </Link>
                        <Link to="/messages" onClick={closeAll} className={`mx-2 px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-150 ${pathname === '/messages' ? 'text-brand bg-brand/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                          <MessageSquare size={16} className="opacity-80" /> Messages
                        </Link>

                        <div className="h-px bg-line/60 my-1.5 mx-2" />

                        {/* Switch Mode Button / Become Host */}
                        {isHost ? (
                          <Link to="/host/dashboard" onClick={closeAll} className="mx-2 px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between text-brand bg-brand/5 hover:bg-brand/10 transition-all duration-150 active:scale-[0.98]">
                            <span className="flex items-center gap-2.5">
                              <ArrowLeftRight size={15} /> Switch to hosting
                            </span>
                          </Link>
                        ) : (
                          <Link to="/host" onClick={closeAll} className="mx-2 px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between text-brand bg-brand/5 hover:bg-brand/10 transition-all duration-150 active:scale-[0.98]">
                            <span className="flex items-center gap-2.5">
                              <Sparkles size={15} /> Become a Host
                            </span>
                          </Link>
                        )}

                        <div className="h-px bg-line/60 my-1.5 mx-2" />

                        <Link to="/help" onClick={closeAll} className="mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink flex items-center gap-3 transition-all duration-150">
                          <LifeBuoy size={16} className="opacity-80" /> Help center
                        </Link>
                        <button onClick={onSignOut} className="w-[calc(100%-16px)] mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-left text-ink-soft hover:bg-red-50 hover:text-red-600 flex items-center gap-3 transition-all duration-150">
                          <LogOut size={16} className="opacity-80" /> Sign out
                        </button>
                      </>
                    )
                  ) : (
                    <>
                      {/* Guest welcoming header */}
                      <div className="px-4 py-3 mx-2 mb-2 rounded-xl bg-gradient-to-br from-brand-soft to-white border border-brand/10">
                        <div className="font-outfit font-bold text-sm text-ink">Welcome to Gathr</div>
                        <div className="text-[11px] text-ink-soft mt-0.5">Book or host unique event venues</div>
                      </div>

                      <div className="h-px bg-line/60 my-1 mx-2" />

                      {/* Logged-out actions */}
                      <Link to="/signin" onClick={closeAll} className="mx-2 px-3 py-2 rounded-xl text-sm font-bold text-brand hover:bg-brand-soft flex items-center gap-3 transition-all duration-150">
                        <LogIn size={16} className="opacity-80" /> Sign in
                      </Link>
                      <Link to="/signup" onClick={closeAll} className="mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink flex items-center gap-3 transition-all duration-150">
                        <UserPlus size={16} className="opacity-80" /> Create account
                      </Link>

                      <div className="h-px bg-line/60 my-1.5 mx-2" />

                      <Link to="/host" onClick={closeAll} className="mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink flex items-center gap-3 transition-all duration-150">
                        <Sparkles size={16} className="text-brand opacity-80" /> Become a Host
                      </Link>
                      <Link to="/help" onClick={closeAll} className="mx-2 px-3 py-2 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink flex items-center gap-3 transition-all duration-150">
                        <LifeBuoy size={16} className="opacity-80" /> Help center
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <Drawer open={open} onOpenChange={(o) => { if (!o) closeAll() }} ariaLabel="Menu">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <Link to={hosting ? '/host/dashboard' : '/'} onClick={close} className="flex items-center gap-2.5 font-outfit font-extrabold text-2xl tracking-[-0.03em] text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02]">
            <span className="w-8 h-8 rounded-lg bg-brand grid place-items-center text-white text-[20px] font-bold font-display italic pb-[3px] shadow-[0_2px_8px_rgba(194,90,30,0.2)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-rotate-6 hover:scale-105">g</span>
            Gathr
          </Link>
          <button className="w-9 h-9 rounded-full border border-line-strong/40 grid place-items-center text-ink-soft transition-all duration-200 hover:bg-tint hover:border-brand hover:text-ink active:scale-95" aria-label="Close menu" onClick={close}>
            <X size={18} />
          </button>
        </div>

        {/* Profile / Greeting Card at Top */}
        <div className="my-4">
          {user ? (
            <div className="p-4 rounded-2xl bg-tint/40 border border-line-strong/30 flex flex-col gap-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-brand text-white grid place-items-center font-bold text-base shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] shadow-brand/10">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-outfit font-bold text-[15px] text-ink leading-tight">{displayName}</span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${hosting ? 'bg-brand-2/10 text-brand-2' : 'bg-brand/10 text-brand'}`}>
                      {hosting ? 'Host' : 'Guest'}
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft truncate">{user.email}</div>
                </div>
              </div>

              {/* Segmented Mode Switcher Control if Host */}
              {isHost && (
                <div className="flex bg-tint/80 p-1 rounded-full text-xs font-semibold border border-line-strong/40">
                  <button
                    onClick={() => { setMode('traveling'); close(); navigate('/') }}
                    className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all duration-300 ${!hosting ? 'bg-white text-brand shadow-[0_2px_6px_rgba(18,16,22,0.08)]' : 'text-ink-soft hover:text-ink'}`}
                  >
                    <Compass size={14} /> Gathering
                  </button>
                  <button
                    onClick={() => { setMode('hosting'); close(); navigate('/host/dashboard') }}
                    className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-all duration-300 ${hosting ? 'bg-white text-brand-2 shadow-[0_2px_6px_rgba(18,16,22,0.08)]' : 'text-ink-soft hover:text-ink'}`}
                  >
                    <Briefcase size={14} /> Hosting
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-soft to-tint/30 border border-brand/10 shadow-sm flex flex-col gap-3">
              <div>
                <div className="font-outfit font-extrabold text-[15px] text-ink">Discover unique spaces</div>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">Book venues for weddings, offsites, shoots, or list yours to start earning.</p>
              </div>
              <Link to="/signin" onClick={close} className="w-full bg-brand text-white font-bold text-center py-2.5 rounded-full border border-white/[0.08] shadow-card transition-all duration-300 hover:bg-brand-press active:scale-[0.98] text-xs">
                Sign in or Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {hosting ? (
            <>
              {/* Host-mode menu */}
              <div className="pb-4">
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint mb-2 px-1">Hosting</span>
                <div className="flex flex-col gap-1">
                  <Link to="/host/dashboard?tab=today" onClick={close} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150 ${pathname === '/host/dashboard' ? 'text-brand-2 bg-brand-2/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                    <CalendarCheck size={16} /> Today
                  </Link>
                  <Link to="/host/dashboard?tab=calendar" onClick={close} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <CalendarDays size={16} /> Calendar
                  </Link>
                  <Link to="/host/dashboard?tab=bookings" onClick={close} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <Inbox size={16} /> Bookings
                  </Link>
                  <Link to="/host/dashboard?tab=listings" onClick={close} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <Store size={16} /> Listings
                  </Link>
                  <Link to="/host/dashboard?tab=messages" onClick={close} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <MessageSquare size={16} /> Messages
                  </Link>
                  <Link to="/host/new" onClick={close} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <Plus size={16} /> Add a venue
                  </Link>
                </div>
              </div>

              <div className="py-4 border-t border-line/60">
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint mb-2 px-1">Resources</span>
                <div className="flex flex-col gap-1">
                  <Link to="/host-resources" onClick={close} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <Briefcase size={16} /> Host resources
                  </Link>
                  <Link to="/pricing-guide" onClick={close} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <Info size={16} /> Pricing guide
                  </Link>
                  <Link to="/help" onClick={close} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <LifeBuoy size={16} /> Help center
                  </Link>
                </div>
              </div>

              <div className="py-4 border-t border-line/60">
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint mb-2 px-1">Switch</span>
                <button onClick={goTraveling} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150 w-full text-left bg-transparent">
                  <Plane size={16} /> Switch to gathering
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Guest / booker menu */}
              <div className="pb-4">
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint mb-2 px-1">Explore</span>
                <div className="flex flex-col gap-1">
                  <Link to="/" onClick={close} className={`flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150 ${pathname === '/' ? 'text-brand bg-brand/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                    <Home size={16} /> Home
                  </Link>
                  <Link to="/search" onClick={close} className={`flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150 ${pathname === '/search' ? 'text-brand bg-brand/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                    <Search size={16} /> All venues
                  </Link>
                  <a href="/#how" onClick={(e) => goAnchor(e, 'how')} className="flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <HelpCircle size={16} /> How it works
                  </a>
                  <a href="/#cities" onClick={(e) => goAnchor(e, 'cities')} className="flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <MapPin size={16} /> Cities
                  </a>
                </div>
              </div>

              {user && (
                <div className="py-4 border-t border-line/60">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint mb-2 px-1">For you</span>
                  <div className="flex flex-col gap-1">
                    <Link to="/saved" onClick={close} className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150 ${pathname === '/saved' ? 'text-brand bg-brand/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                      <span className="flex items-center gap-3.5">
                        <Heart size={16} /> Saved venues
                      </span>
                      {ids.length > 0 && (
                        <span className="bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 h-5 flex items-center justify-center">
                          {ids.length}
                        </span>
                      )}
                    </Link>
                    <Link to="/bookings" onClick={close} className={`flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150 ${pathname === '/bookings' ? 'text-brand bg-brand/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                      <CalendarCheck size={16} /> Your bookings
                    </Link>
                    <Link to="/messages" onClick={close} className={`flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150 ${pathname === '/messages' ? 'text-brand bg-brand/5' : 'text-ink-soft hover:bg-tint hover:text-ink'}`}>
                      <MessageSquare size={16} /> Messages
                    </Link>
                  </div>
                </div>
              )}

              <div className="py-4 border-t border-line/60">
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint mb-2 px-1">Your venue</span>
                <div className="flex flex-col gap-1">
                  {isHost ? (
                    <Link to="/host/dashboard" onClick={close} className="flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                      <Store size={16} /> Host dashboard
                    </Link>
                  ) : (
                    <Link to="/host" onClick={close} className="flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                      <Sparkles size={16} /> Become a Host
                    </Link>
                  )}
                </div>
              </div>

              <div className="py-4 border-t border-line/60">
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint mb-2 px-1">Support</span>
                <div className="flex flex-col gap-1">
                  <Link to="/help" onClick={close} className="flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <LifeBuoy size={16} /> Help center
                  </Link>
                  <Link to="/contact" onClick={close} className="flex items-center gap-3.5 py-2.5 px-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-tint hover:text-ink transition-all duration-150">
                    <Info size={16} /> Contact
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Area with Sign out if logged in */}
        {user && (
          <div className="mt-auto pt-4 border-t border-line/60">
            <button onClick={onSignOut} className="w-full py-3 px-4 rounded-xl border border-line-strong/60 bg-white font-semibold text-sm text-ink-soft hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98]">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </Drawer>
    </>
  )
}
