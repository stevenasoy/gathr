import { Link } from 'react-router-dom'
import { BookOpen, Camera, MessageSquare, BarChart3, Sparkles, Calendar } from 'lucide-react'
import Footer from '../components/Footer'

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]"

const ARTICLES = [
  { icon: Camera, title: 'Listing photography 101', read: '6 min read', body: 'Light, angles, and the five frames every listing needs. Built from what our top hosts shoot.' },
  { icon: MessageSquare, title: 'Writing inquiries that convert', read: '4 min read', body: 'Templates and tone for first messages, follow-ups, and the post-event thank-you.' },
  { icon: BarChart3, title: 'Pricing for weekends + peak', read: '8 min read', body: 'How to layer base, peak-day, and minimum-hour pricing without scaring bookers off.' },
  { icon: Calendar, title: 'Calendar strategy for weddings', read: '5 min read', body: 'Buffer days, holding fees, and how the best hosts handle Saturday demand.' },
  { icon: Sparkles, title: 'Becoming a Guest Favorite', read: '5 min read', body: 'The metrics we look at and what consistent hosts do differently in their first 90 days.' },
  { icon: BookOpen, title: 'Host policy playbook', read: '10 min read', body: 'Cancellations, deposits, overtime, and damage — wording you can paste into your house rules.' },
]

export default function HostResources() {
  return (
    <>
      <main>
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="wrap relative z-[1]">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Host resources</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Playbooks from the Hosts doing it best.</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">Field-tested guides on photography, pricing, calendar strategy, and policy — built from what our top Hosts actually do.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
              {ARTICLES.map((a) => (
                <div className="p-6 border border-line rounded-lg bg-surface transition-all duration-150 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-bar" key={a.title}>
                  <div className="w-10 h-10 rounded-xl bg-tint text-brand grid place-items-center mb-3"><a.icon size={20} /></div>
                  <h3 className="text-[17px] font-bold mb-1.5">{a.title}</h3>
                  <p className="text-[14.5px] text-ink-soft leading-relaxed m-0 mb-2.5">{a.body}</p>
                  <span className="inline-block text-xs font-semibold text-ink-faint">{a.read}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-6 py-7 px-8 rounded-lg bg-tint border border-line flex-wrap">
              <div>
                <h3 className="text-xl font-extrabold">Want to be featured?</h3>
                <p className="text-ink-soft mt-1.5 mb-0 text-[14.5px]">If you've cracked something other hosts could learn from, our editorial team wants to talk.</p>
              </div>
              <Link to="/contact" className={baseBtn} style={{ width: 'auto', padding: '13px 22px' }}>Pitch a story</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
