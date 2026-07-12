import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]"

const STATS = [
  { n: '1.4K+', label: 'Venues listed' },
  { n: '12', label: 'Cities covered' },
  { n: '38K', label: 'Events hosted' },
  { n: '4.91', label: 'Average rating' },
]

const VALUES = [
  { title: 'Hosts first', body: 'When the host wins, the guest wins, and the platform wins. Every product decision starts there.' },
  { title: 'Transparent pricing', body: 'One fee, billed once. No surge surprises, no hidden surcharges, no "service" line items.' },
  { title: 'Build for the room', body: 'We don\'t copy global playbooks. Filipino weddings, brand launches, and offsites have their own rules — we build for those.' },
]

export default function About() {
  return (
    <>
      <main>
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="wrap relative z-[1]">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">About</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">The marketplace built for Filipino events.</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">Gathr started in Cebu in 2024 — built by a small team who got tired of chasing event venues over Viber. We're now the home for hosts and bookers across the country.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <div className="grid grid-cols-4 gap-[18px]">
              {STATS.map((s) => (
                <div className="p-6 border border-line rounded-lg bg-surface text-center" key={s.label}>
                  <b className="block text-[30px] font-extrabold bg-gradient bg-clip-text text-transparent">{s.n}</b>
                  <span className="text-ink-soft text-sm mt-1 block">{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-[18px]">What we believe</h2>
            <div className="grid grid-cols-3 gap-[18px]">
              {VALUES.map((v) => (
                <div className="p-6 border border-line rounded-lg bg-surface transition-all duration-150 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-bar" key={v.title}>
                  <h3 className="text-[17px] font-bold mb-1.5">{v.title}</h3>
                  <p className="text-[14.5px] text-ink-soft leading-relaxed m-0">{v.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-[18px]">Where we work</h2>
            <p className="text-ink-soft text-base leading-relaxed" style={{ maxWidth: 720 }}>HQ is in Cebu. We also have hosts and ops people in Manila, Tagaytay, Bohol, Davao, and Baguio. If you'd like to host with us in a city we don't cover yet, <Link to="/contact" className="font-semibold text-brand hover:underline">let us know</Link>.</p>
          </section>

          <section>
            <div className="flex items-center justify-between gap-6 py-7 px-8 rounded-lg bg-tint border border-line flex-wrap">
              <div>
                <h3 className="text-xl font-extrabold">Want to work with us?</h3>
                <p className="text-ink-soft mt-1.5 mb-0 text-[14.5px]">We hire across product, hosting ops, and growth.</p>
              </div>
              <Link to="/careers" className={baseBtn} style={{ width: 'auto', padding: '13px 22px' }}>See open roles</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
