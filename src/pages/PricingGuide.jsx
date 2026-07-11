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
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">Pricing guide</span>
            <h1>Free to list. One simple fee.</h1>
            <p>Listing your space costs nothing. Gathr adds a small service fee to the guest’s total, and only when a booking is confirmed.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <h2>How it works</h2>
            <div className="content-grid">
              {POINTS.map((t) => (
                <div className="content-card pricing-tier" key={t.label}>
                  <span className="tier-fee">{t.fee}</span>
                  <h3>{t.label}</h3>
                  <p>{t.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>A sample booking</h2>
            <div className="pricing-table">
              <div className="pt-row"><span>Venue rate (4 hours × ₱6,500)</span><span>₱26,000</span></div>
              <div className="pt-row"><span>Service fee (10%, added for the guest)</span><span>₱2,600</span></div>
              <div className="pt-row pt-total"><span>Guest pays</span><span>₱28,600</span></div>
              <div className="pt-row" style={{ borderTop: '1px solid var(--line)', marginTop: 4, paddingTop: 12 }}><span>You receive</span><span>₱26,000</span></div>
            </div>
          </section>

          <section>
            <h2>Frequently asked</h2>
            <div className="faq-list">
              {FAQ.map((f) => (
                <details className="faq-item" key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <div className="banner-card">
              <div>
                <h3>Ready to list?</h3>
                <p>It takes a few minutes and goes live right away.</p>
              </div>
              <Link to="/host" className="btn-primary" style={{ width: 'auto', padding: '13px 22px' }}>List your venue</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
