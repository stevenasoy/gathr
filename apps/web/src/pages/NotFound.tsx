import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import Footer from '../components/Footer'

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]"

export default function NotFound() {
  return (
    <>
      <main className="wrap empty text-center" style={{ paddingTop: 100, paddingBottom: 100 }}>
        <MapPin size={40} className="text-brand mb-3.5 mx-auto" />
        <h1 className="mb-2">This page doesn't exist</h1>
        <p className="text-ink-soft mb-6">
          The link may be old, or the venue may have been unlisted.
        </p>
        <div className="inline-flex gap-3 flex-wrap justify-center">
          <Link to="/" className={baseBtn} style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Back to home</Link>
          <Link to="/search" className="py-[13px] px-4 rounded-xl border border-line-strong bg-white font-semibold text-[15px] text-ink transition-colors duration-150 hover:bg-tint" style={{ display: 'inline-block' }}>Browse venues</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
