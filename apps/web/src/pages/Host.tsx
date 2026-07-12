import { Link } from 'react-router-dom'
import { Wallet, Calendar, ListChecks, Zap, Tag, Search } from 'lucide-react'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useVenues } from '../context/VenuesContext'

const BENEFITS = [
  { icon: Wallet, title: 'Set your own price', body: 'You choose your hourly rate and which kinds of events you take. Change it anytime from your dashboard.' },
  { icon: ListChecks, title: 'Approve every booking', body: 'Each request comes to you with the date, guest count, and total. Confirm or decline. Nothing is locked until you say yes.' },
  { icon: Calendar, title: 'One Host dashboard', body: 'Pending requests, upcoming events, a month calendar, and your listings all live in one place.' },
  { icon: Zap, title: 'Live in minutes', body: 'List your venue yourself in a few short steps. It appears in Gathr search right away, no waitlist, no call.' },
  { icon: Tag, title: 'Free to list', body: 'Listing costs nothing. Gathr adds a service fee to the guest’s total when a booking is confirmed. No subscriptions.' },
  { icon: Search, title: 'Reach event planners', body: 'Your listing shows up for people planning weddings, offsites, parties, and shoots across the Philippines.' },
]

const FAQ = [
  { q: 'How much does it cost to list?', a: 'Nothing. Listing is free. Gathr adds a service fee to the guest’s booking total when a request is confirmed. There are no subscriptions or upfront fees.' },
  { q: 'How long until my listing is live?', a: 'Right away. You create the listing yourself in a few steps and it appears in search immediately. You can delete it anytime.' },
  { q: 'How do bookings work?', a: 'Guests send a request with their date, hours, and guest count. You review it in your dashboard and confirm or decline. Nothing is committed until you confirm.' },
  { q: 'Can I edit or remove my listing?', a: 'You can delete a listing anytime from your dashboard. In-place editing of listing details is on the way.' },
]

export default function Host() {
  const { user } = useAuth()
  const { dbVenues } = useVenues()
  const isHost = !!user && dbVenues.some((v) => v.ownerId === user.id)
  const primary = isHost
    ? { to: '/host/dashboard', label: 'Go to your dashboard' }
    : { to: '/host/new', label: 'List your venue' }

  return (
    <>
      <main>
        <section className="page-hero page-hero-grad">
          <div className="max-w-wrap mx-auto px-10">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">For Hosts</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Turn your space <br />into <span className="font-display italic font-semibold bg-gradient bg-clip-text text-transparent">income.</span></h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">List your rooftop, garden, hall, or studio on Gathr and reach people planning weddings, launches, and offsites across the Philippines.</p>
            <div className="inline-flex gap-2.5 flex-wrap justify-center" style={{ marginTop: 22 }}>
              <Link to={primary.to} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ display: 'inline-block', width: 'auto', padding: '14px 24px' }}>{primary.label}</Link>
              {isHost && <Link to="/pricing-guide" className="py-[9px] px-4 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-tint" style={{ background: '#fff' }}>See pricing</Link>}
            </div>
          </div>
        </section>

        <div className="max-w-wrap mx-auto px-10 py-12 pb-20">
          <section className="mb-14">
            <h2 className="text-2xl font-extrabold mb-[18px]">Why Hosts choose Gathr</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
              {BENEFITS.map((b, i) => (
                <div className={`p-6 border rounded-lg transition-all duration-150 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-bar ${i === 0 ? 'bg-brand text-white border-brand shadow-[0_12px_30px_rgba(194,90,30,0.1)] hover:shadow-[0_16px_36px_rgba(194,90,30,0.2)] hover:border-brand-press' : 'bg-surface border-line'}`} key={b.title}>
                  <div className={`w-10 h-10 rounded-xl grid place-items-center mb-3 ${i === 0 ? 'bg-white/[0.15] text-white' : 'bg-tint text-brand'}`}><b.icon size={20} /></div>
                  <h3 className="text-[17px] font-bold mb-1.5">{b.title}</h3>
                  <p className={`text-[14.5px] leading-relaxed m-0 ${i === 0 ? 'text-white/[0.85]' : 'text-ink-soft'}`}>{b.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="text-2xl font-extrabold mb-[18px]">Frequently asked</h2>
            <div className="border border-line rounded-lg overflow-hidden bg-white">
              {FAQ.map((f) => (
                <details className="py-[18px] px-[22px] border-b border-line last:border-b-0" key={f.q}>
                  <summary className="font-bold cursor-pointer text-base list-none flex justify-between items-center">{f.q}<span className="text-[22px] text-ink-faint font-normal leading-none">+</span></summary>
                  <p className="mt-3 text-ink-soft text-[15px] leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mb-0">
            <div className="flex items-center justify-between gap-6 py-7 px-8 rounded-lg bg-tint border border-line flex-wrap">
              <div>
                <h3 className="text-xl font-extrabold">Ready to list your space?</h3>
                <p className="text-ink-soft mt-1.5 mb-0 text-[14.5px]">It takes a few minutes and goes live right away.</p>
              </div>
              <Link to={primary.to} className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '14px 26px', whiteSpace: 'nowrap' }}>{primary.label}</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
