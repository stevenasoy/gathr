import { Link, useNavigate } from 'react-router-dom'
import { useMode } from '../context/ModeContext'

export default function Footer() {
  const { mode, setMode } = useMode()
  const navigate = useNavigate()
  const hosting = mode === 'hosting'

  const bookAsGatherer = () => { setMode('traveling'); navigate('/search') }

  return (
    <footer className="bg-white border-t border-line mt-14">
      {/* Promoted host/booker CTA banner card */}
      <div className="max-w-wrap mx-auto px-6 sm:px-10 pt-12">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient text-white p-8 sm:p-12 shadow-[0_16px_40px_rgba(194,90,30,0.15)]">
          {/* Decorative mesh glow */}
          <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none" style={{
            background: `
              radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25) 0%, transparent 60%),
              radial-gradient(circle at 20% 80%, rgba(0,0,0,0.3) 0%, transparent 60%)
            `
          }} />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-[540px]">
              {hosting ? (
                <>
                  <h3 className="font-outfit text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    Planning a gathering<br className="hidden sm:inline" /> of your own?
                  </h3>
                  <p className="mt-3 text-base text-white/90 leading-relaxed font-medium">
                    Switch over and browse extraordinary venues for your next wedding, corporate offsite, or celebration.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-outfit text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    Have a space worth<br className="hidden sm:inline" /> gathering in?
                  </h3>
                  <p className="mt-3 text-base text-white/90 leading-relaxed font-medium">
                    List it on Gathr and reach guests planning their next wedding, corporate launch, workshop, or private dinner.
                  </p>
                </>
              )}
            </div>
            
            <div className="shrink-0">
              {hosting ? (
                <button 
                  onClick={bookAsGatherer} 
                  className="bg-white text-ink font-bold py-4 px-8 rounded-full text-[15px] whitespace-nowrap shadow-[0_4px_14px_rgba(255,255,255,0.15)] transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_20px_rgba(255,255,255,0.25)] active:scale-[0.98] border border-white/[0.2]"
                >
                  Book a venue
                </button>
              ) : (
                <Link to="/host">
                  <button 
                    className="bg-white text-ink font-bold py-4 px-8 rounded-full text-[15px] whitespace-nowrap shadow-[0_4px_14px_rgba(255,255,255,0.15)] transition-all duration-300 hover:scale-105 hover:shadow-[0_6px_20px_rgba(255,255,255,0.25)] active:scale-[0.98] border border-white/[0.2]"
                  >
                    List your venue
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-wrap mx-auto px-6 sm:px-10 grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-[30px] py-12 pb-8">
        <div className="foot-col foot-about">
          <Link to="/" className="flex items-center gap-2.5 font-outfit font-extrabold text-2xl tracking-[-0.03em] text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02]">
            <span className="w-8 h-8 rounded-lg bg-brand grid place-items-center text-white text-[20px] font-bold font-display italic pb-[3px] shadow-[0_2px_8px_rgba(194,90,30,0.2)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-rotate-6 hover:scale-105">g</span>
            Gathr
          </Link>
          <p className="text-ink-soft text-sm max-w-[280px] mt-3">The marketplace for event venues across the Philippines. Find the space, lock the date, host the moment.</p>
        </div>
        <div className="foot-col">
          <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink mb-3.5">Explore</h4>
          <Link to="/search?type=wedding" className="block text-ink-soft text-sm py-1 hover:text-brand">Weddings</Link>
          <Link to="/search?type=corporate" className="block text-ink-soft text-sm py-1 hover:text-brand">Corporate events</Link>
          <Link to="/search?type=party" className="block text-ink-soft text-sm py-1 hover:text-brand">Birthday parties</Link>
          <Link to="/search?type=workshop" className="block text-ink-soft text-sm py-1 hover:text-brand">Workshops</Link>
          <Link to="/search?type=studio" className="block text-ink-soft text-sm py-1 hover:text-brand">Photo studios</Link>
        </div>
        <div className="foot-col">
          <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink mb-3.5">For Hosts</h4>
          <Link to="/host" className="block text-ink-soft text-sm py-1 hover:text-brand">List your venue</Link>
          <Link to="/host-resources" className="block text-ink-soft text-sm py-1 hover:text-brand">Host resources</Link>
          <Link to="/pricing-guide" className="block text-ink-soft text-sm py-1 hover:text-brand">Pricing guide</Link>
          <Link to="/community" className="block text-ink-soft text-sm py-1 hover:text-brand">Community</Link>
        </div>
        <div className="foot-col">
          <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink mb-3.5">Company</h4>
          <Link to="/about" className="block text-ink-soft text-sm py-1 hover:text-brand">About</Link>
          <Link to="/careers" className="block text-ink-soft text-sm py-1 hover:text-brand">Careers</Link>
          <Link to="/help" className="block text-ink-soft text-sm py-1 hover:text-brand">Support</Link>
          <Link to="/contact" className="block text-ink-soft text-sm py-1 hover:text-brand">Contact</Link>
        </div>
      </div>

      <div className="max-w-wrap mx-auto px-6 sm:px-10 flex justify-between items-center border-t border-line py-5 text-[13px] text-ink-soft flex-wrap gap-3">
        <span>© 2026 Gathr. A concept demo.</span>
        <span className="inline-flex items-center gap-2">
          <Link to="/privacy" className="text-ink-soft hover:text-brand">Privacy</Link>
          <span className="text-line-strong">·</span>
          <Link to="/terms" className="text-ink-soft hover:text-brand">Terms</Link>
          <span className="text-line-strong">·</span>
          <Link to="/sitemap" className="text-ink-soft hover:text-brand">Sitemap</Link>
        </span>
      </div>
    </footer>
  )
}
