import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, CalendarCheck, CreditCard, ShieldCheck, MessageSquare, RefreshCcw, Building2, Users } from 'lucide-react'
import Footer from '../components/Footer'

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
        <section className="page-hero page-hero-grad">
          <div className="wrap">
            <span className="page-eyebrow">Help center</span>
            <h1>How can we help?</h1>
            <p>Search our help topics, or jump straight to the answers our team gives most often.</p>
            <div className="help-search">
              <Search size={18} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help articles" />
            </div>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <h2>Browse by topic</h2>
            <div className="content-grid">
              {TOPICS.map((t) => (
                <div className="content-card" key={t.title}>
                  <div className="icon-pill"><t.icon size={20} /></div>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Common questions</h2>
            <div className="faq-list">
              {filteredFaq.length ? filteredFaq.map((f) => (
                <details className="faq-item" key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              )) : (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <p>No articles match "{query}". Try a different keyword or <Link to="/contact" style={{ color: 'var(--brand)', fontWeight: 600 }}>contact our team</Link>.</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="banner-card">
              <div>
                <h3>Still stuck?</h3>
                <p>Our support team usually replies within an hour during PHT business hours.</p>
              </div>
              <Link to="/contact" className="btn-primary" style={{ width: 'auto', padding: '13px 22px' }}>Contact support</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
