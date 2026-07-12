import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, CalendarCheck, CreditCard, ShieldCheck, MessageSquare, RefreshCcw, Building2, Users } from 'lucide-react'
import Footer from '../components/Footer'

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]"

const TOPICS = [
  { icon: CalendarCheck, title: 'Booking a venue', body: 'Searching, requesting, and confirming a date.' },
  { icon: CreditCard, title: 'Payments & receipts', body: 'How charges, refunds, and receipts work.' },
  { icon: ShieldCheck, title: 'Safety & damage protection', body: 'What\'s covered and how to file a claim.' },
  { icon: MessageSquare, title: 'Messaging Hosts', body: 'Where to find your inbox and reply timing.' },
  { icon: RefreshCcw, title: 'Changes & cancellations', body: 'Reschedules, partial refunds, and Host overrides.' },
  { icon: Building2, title: 'Listing on Gathr', body: 'Onboarding, pricing, and venue policy basics.' },
  { icon: Users, title: 'Accounts & verification', body: 'ID checks, two-factor, and account recovery.' },
  { icon: Search, title: 'Trouble with search', body: 'Filters, location matches, and missing venues.' },
]

const FAQ = [
  { q: 'How do I request a booking?', a: 'Open the venue page, pick a date, hours, and guest count, then click Request to book. The host typically replies within an hour.' },
  { q: 'When am I charged?', a: 'Not until the host confirms your date. After that, we hold the full amount and release it to the host 24 hours after your event ends.' },
  { q: 'Can I cancel after booking?', a: 'Yes. Most venues offer a free cancellation window of 48-72 hours. After that, the host\'s cancellation policy applies.' },
  { q: 'What if something breaks during my event?', a: 'Standard wear-and-tear is fine. Major damage is covered up to ₱100,000 per booking under our damage protection plan.' },
  { q: 'How do I contact a host before booking?', a: 'Use the Contact host button on the venue page. Messages are routed through Gathr so we can step in if anything goes sideways.' },
]

export default function Help() {
  const [query, setQuery] = useState('')
  const filteredFaq = FAQ.filter((f) => !query || (f.q + f.a).toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <main>
        <section className="py-14 pb-10 bg-surface border-b border-line text-center relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #fff 100%)' }}>
          <div className="wrap relative z-[1]">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Help center</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">How can we help?</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">Search our help topics, or jump straight to the answers our team gives most often.</p>
            <div className="flex items-center gap-2.5 max-w-[480px] mx-auto mt-5 py-3.5 px-5 bg-white border border-line-strong rounded-full shadow-bar">
              <Search size={18} className="text-ink-faint" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help articles" className="flex-1 border-0 outline-0 font-[inherit] text-[15px] bg-transparent text-ink" />
            </div>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <h2 className="text-2xl font-extrabold mb-[18px]">Browse by topic</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
              {TOPICS.map((t) => (
                <div className="p-6 border border-line rounded-lg bg-surface transition-all duration-150 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-bar" key={t.title}>
                  <div className="w-10 h-10 rounded-xl bg-tint text-brand grid place-items-center mb-3"><t.icon size={20} /></div>
                  <h3 className="text-[17px] font-bold mb-1.5">{t.title}</h3>
                  <p className="text-[14.5px] text-ink-soft leading-relaxed m-0">{t.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold mb-[18px]">Common questions</h2>
            <div className="border border-line rounded-lg overflow-hidden bg-white">
              {filteredFaq.length ? filteredFaq.map((f) => (
                <details className="py-[18px] px-[22px] border-b border-line" key={f.q}>
                  <summary className="font-bold cursor-pointer text-base list-none flex justify-between items-center">{f.q}<span className="text-[22px] text-ink-faint font-normal leading-none">+</span></summary>
                  <p className="mt-3 text-ink-soft text-[15px] leading-relaxed">{f.a}</p>
                </details>
              )) : (
                <div className="text-center py-10 px-5 text-ink-soft">
                  <p>No articles match "{query}". Try a different keyword or <Link to="/contact" className="font-semibold text-brand hover:underline">contact our team</Link>.</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-6 py-7 px-8 rounded-lg bg-tint border border-line flex-wrap">
              <div>
                <h3 className="text-xl font-extrabold">Still stuck?</h3>
                <p className="text-ink-soft mt-1.5 mb-0 text-[14.5px]">Our support team usually replies within an hour during PHT business hours.</p>
              </div>
              <Link to="/contact" className={baseBtn} style={{ width: 'auto', padding: '13px 22px' }}>Contact support</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
