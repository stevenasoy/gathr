import { Link } from 'react-router-dom'
import { Quote } from 'lucide-react'
import Footer from '../components/Footer'

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]"

const STORIES = [
  {
    name: 'Mara, Skyloft Rooftop',
    city: 'Cebu City',
    months: '14 months on Gathr',
    quote: 'I used to chase event planners for bookings. Now my calendar fills itself two months out. The damage protection alone is why I stayed.',
  },
  {
    name: 'Lito, The Ridge Garden',
    city: 'Tagaytay',
    months: '22 months on Gathr',
    quote: 'We were booking 4 weddings a quarter. After moving to Gathr, that became 4 a month — without dropping our rates.',
  },
  {
    name: 'Janelle, The Foundry',
    city: 'Makati',
    months: '8 months on Gathr',
    quote: 'I love that I can block dates instantly when I want my own studio time. No more juggling agents who don\'t respect my calendar.',
  },
  {
    name: 'Diego, Shoreline Pavilion',
    city: 'Panglao, Bohol',
    months: '20 months on Gathr',
    quote: 'Most of our bookings now come from Manila couples who never would have found us. The reach changed our season.',
  },
]

export default function Community() {
  return (
    <>
      <main>
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="wrap relative z-[1]">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Community</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">The hosts behind the spaces.</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">Stories from the rooftops, gardens, and halls that make up Gathr. The why, the math, the lessons.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <div className="grid grid-cols-2 gap-[18px]">
              {STORIES.map((s) => (
                <div className="p-7 border border-line rounded-lg bg-white relative" key={s.name}>
                  <Quote size={22} className="text-brand opacity-35 mb-3.5" />
                  <p className="text-base leading-relaxed text-ink m-0 mb-[18px]">{s.quote}</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-line">
                    <div>
                      <b className="block text-[15px]">{s.name}</b>
                      <span className="text-ink-soft text-[13px]">{s.city} · {s.months}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-6 py-7 px-8 rounded-lg bg-tint border border-line flex-wrap">
              <div>
                <h3 className="text-xl font-extrabold">Have a story worth telling?</h3>
                <p className="text-ink-soft mt-1.5 mb-0 text-[14.5px]">We publish a host story every month. Yours could be next.</p>
              </div>
              <Link to="/contact" className={baseBtn} style={{ width: 'auto', padding: '13px 22px' }}>Get in touch</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
