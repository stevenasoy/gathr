import { Link } from 'react-router-dom'
import { Quote } from 'lucide-react'
import Footer from '../components/Footer'

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
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">Community</span>
            <h1>The hosts behind the spaces.</h1>
            <p>Stories from the rooftops, gardens, and halls that make up Gathr. The why, the math, the lessons.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <div className="content-grid stories-grid">
              {STORIES.map((s) => (
                <div className="story-card" key={s.name}>
                  <Quote size={22} className="story-quote-mark" />
                  <p className="story-quote">{s.quote}</p>
                  <div className="story-author">
                    <div>
                      <b>{s.name}</b>
                      <span>{s.city} · {s.months}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="banner-card">
              <div>
                <h3>Have a story worth telling?</h3>
                <p>We publish a host story every month. Yours could be next.</p>
              </div>
              <Link to="/contact" className="btn-primary" style={{ width: 'auto', padding: '13px 22px' }}>Get in touch</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
