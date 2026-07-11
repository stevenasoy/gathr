import { Link } from 'react-router-dom'
import { BookOpen, Camera, MessageSquare, BarChart3, Sparkles, Calendar } from 'lucide-react'
import Footer from '../components/Footer'

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
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">Host resources</span>
            <h1>Playbooks from the Hosts doing it best.</h1>
            <p>Field-tested guides on photography, pricing, calendar strategy, and policy — built from what our top Hosts actually do.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <div className="content-grid">
              {ARTICLES.map((a) => (
                <div className="content-card" key={a.title}>
                  <div className="icon-pill"><a.icon size={20} /></div>
                  <h3>{a.title}</h3>
                  <p style={{ marginBottom: 10 }}>{a.body}</p>
                  <span className="meta-tag">{a.read}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="banner-card">
              <div>
                <h3>Want to be featured?</h3>
                <p>If you've cracked something other hosts could learn from, our editorial team wants to talk.</p>
              </div>
              <Link to="/contact" className="btn-primary" style={{ width: 'auto', padding: '13px 22px' }}>Pitch a story</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
