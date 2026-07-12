import { Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import Footer from '../components/Footer'

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]"

export default function Careers() {
  return (
    <>
      <main>
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="wrap relative z-[1]">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Careers</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Build the home for Filipino events.</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">We're a small team in Cebu and Manila. We're not hiring at the moment, but we keep this page updated when that changes.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <div className="text-center py-[60px] px-5">
            <Briefcase size={40} strokeWidth={1.5} className="text-ink-faint mb-3.5 mx-auto" />
            <h2 className="text-[22px] font-extrabold mb-2">No open roles right now</h2>
            <p className="text-ink-soft max-w-[460px] mx-auto mb-5 text-[15px] leading-relaxed">We don't have any positions open today. If you think you'd be a fit for the team down the line, send us a note and we'll keep you in mind when we start hiring.</p>
            <Link to="/contact" className={baseBtn} style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Get in touch</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
