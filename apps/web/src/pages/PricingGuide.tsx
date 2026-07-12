import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

const POINTS = [
  { fee: 'Free', label: 'Free to list', body: 'Creating a listing costs nothing. There are no subscriptions, listing fees, or upfront charges.' },
  { fee: '10%', label: 'Guest service fee', body: 'A 10% service fee is added to the guest’s total at checkout. That fee is how Gathr earns.' },
  { fee: '100%', label: 'You keep your rate', body: 'Your hourly rate goes to you. The service fee sits on top of your price, not inside it.' },
]

const FAQ = [
  { q: 'How much does Gathr cost a Host?', a: 'Listing is free. Gathr’s 10% service fee is added to the guest’s total, so it doesn’t come out of your rate.' },
  { q: 'How does payment work?', a: 'Gathr is currently a preview. A confirmed request is an agreement between you and the guest, and you arrange payment directly. Built-in online payments and payouts are on the roadmap.' },
  { q: 'Are there any hidden fees?', a: 'No. The 10% guest service fee is the only fee. No subscriptions, no listing fees, no markups.' },
  { q: 'Can I change my price later?', a: 'You set your hourly rate when you list. You can delete and re-list to change it for now; in-place editing is on the way.' },
]

export default function PricingGuide() {
  return (
    <>
      <main>
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="max-w-wrap mx-auto px-10">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Pricing guide</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Free to list. One simple fee.</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">Listing your space costs nothing. Gathr adds a small service fee to the guest’s total, and only when a booking is confirmed.</p>
          </div>
        </section>

        <div className="max-w-wrap mx-auto px-10 py-12 pb-20">
          <section className="mb-14">
            <h2 className="text-2xl font-extrabold mb-[18px]">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
              {POINTS.map((t) => (
                <div className="relative p-6 border border-line rounded-lg bg-surface transition-all duration-150 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-bar" key={t.label}>
                  <span className="block text-[36px] font-extrabold bg-gradient bg-clip-text text-transparent mb-1.5 leading-none font-mono">{t.fee}</span>
                  <h3 className="text-[17px] font-bold mb-1.5">{t.label}</h3>
                  <p className="text-[14.5px] text-ink-soft leading-relaxed m-0">{t.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="text-2xl font-extrabold mb-[18px]">A sample booking</h2>
            <div className="border border-line rounded-lg overflow-hidden bg-white">
              <div className="flex justify-between py-4 px-[22px] border-b border-line text-[15px]"><span>Venue rate (<span className="font-mono">4</span> hours × <span className="font-mono">₱6,500</span>)</span><span className="font-mono font-semibold">₱26,000</span></div>
              <div className="flex justify-between py-4 px-[22px] border-b border-line text-[15px]"><span>Service fee (<span className="font-mono">10%</span>, added for the guest)</span><span className="font-mono font-semibold">₱2,600</span></div>
              <div className="flex justify-between py-4 px-[22px] border-b border-line text-[15px] bg-tint font-bold"><span>Guest pays</span><span className="font-mono">₱28,600</span></div>
              <div className="flex justify-between py-4 px-[22px] text-[15px]" style={{ borderTop: '1px solid var(--line)', marginTop: 4, paddingTop: 12 }}><span>You receive</span><span className="font-mono font-semibold">₱26,000</span></div>
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
                <h3 className="text-xl font-extrabold">Ready to list?</h3>
                <p className="text-ink-soft mt-1.5 mb-0 text-[14.5px]">It takes a few minutes and goes live right away.</p>
              </div>
              <Link to="/host" className="w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98]" style={{ width: 'auto', padding: '13px 22px' }}>List your venue</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
