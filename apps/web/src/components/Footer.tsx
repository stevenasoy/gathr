import { Link, useNavigate } from 'react-router-dom'
import { useMode } from '../context/ModeContext'

export default function Footer() {
  const { mode, setMode } = useMode()
  const navigate = useNavigate()
  const hosting = mode === 'hosting'

  const bookAsGatherer = () => { setMode('traveling'); navigate('/search') }

  return (
    <footer className="bg-white border-t border-line mt-14">
      <div className="bg-gradient text-white">
        <div className="max-w-wrap mx-auto px-10 flex items-center justify-between gap-6 py-11 flex-wrap">
          {hosting ? (
            <>
              <div>
                <h3 className="text-[28px] font-extrabold max-w-[460px]">Planning a gathering of your own?</h3>
                <p className="mt-2 opacity-[0.92] max-w-[460px]">Switch over and book a venue for your next wedding, offsite, or celebration.</p>
              </div>
              <button onClick={bookAsGatherer} className="bg-white text-ink font-extrabold py-3.5 px-7 rounded-full text-[15px] transition-transform duration-200 border border-white/[0.4] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(18,16,22,0.2)] active:translate-y-0 active:scale-[0.98]">Book a venue</button>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-[28px] font-extrabold max-w-[460px]">Have a space worth gathering in?</h3>
                <p className="mt-2 opacity-[0.92] max-w-[460px]">List it on Gathr and reach Gatherers planning their next wedding, offsite, or launch.</p>
              </div>
              <Link to="/host">
                <button className="bg-white text-ink font-extrabold py-3.5 px-7 rounded-full text-[15px] transition-transform duration-200 border border-white/[0.4] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(18,16,22,0.2)] active:translate-y-0 active:scale-[0.98]">List your venue</button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="max-w-wrap mx-auto px-10 grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-[30px] py-12 pb-8">
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

      <div className="max-w-wrap mx-auto px-10 flex justify-between items-center border-t border-line py-5 text-[13px] text-ink-soft flex-wrap gap-3">
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
