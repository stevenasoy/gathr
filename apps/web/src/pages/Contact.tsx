import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageSquare, Building2 } from 'lucide-react'
import Footer from '../components/Footer'

type ContactForm = { name: string; email: string; topic: string; message: string }

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ContactForm>({ name: '', email: '', topic: 'general', message: '' })
  const onChange = (k: keyof ContactForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value })

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to submit.')
      }
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <main>
        <section className="page-hero">
          <div className="wrap">
            <span className="page-eyebrow">Contact</span>
            <h1>Talk to a human.</h1>
            <p>Most messages get a reply within an hour during PHT business hours. For urgent bookings, use the help center search first.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <div className="contact-layout">
              <div>
                <div className="form-card" style={{ margin: 0 }}>
                  {submitted ? (
                    <div className="empty-state" style={{ padding: '20px 0' }}>
                      <h2>Got it.</h2>
                      <p>Thanks {form.name.split(' ')[0]}. Our team will reply to {form.email} shortly.</p>
                      <Link to="/" className="btn-clear">Back to home</Link>
                    </div>
                  ) : (
                    <form onSubmit={onSubmit}>
                      <div className="form-row">
                        <label>Name</label>
                        <input required value={form.name} onChange={onChange('name')} placeholder="Your name" />
                      </div>
                      <div className="form-row">
                        <label>Email</label>
                        <input required type="email" value={form.email} onChange={onChange('email')} placeholder="you@email.com" />
                      </div>
                      <div className="form-row">
                        <label>Topic</label>
                        <select value={form.topic} onChange={onChange('topic')} style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--line-strong)', borderRadius: 12, fontFamily: 'inherit', fontSize: 14, background: '#fff' }}>
                          <option value="general">General question</option>
                          <option value="booking">Booking support</option>
                          <option value="hosting">Host question</option>
                          <option value="press">Press / media</option>
                          <option value="careers">Careers application</option>
                        </select>
                      </div>
                      <div className="form-row">
                        <label>Message</label>
                        <textarea required value={form.message} onChange={onChange('message')} placeholder="How can we help?" />
                      </div>
                      {error && <div className="form-error">{error}</div>}
                      <button className="btn-primary" type="submit" disabled={loading}>
                        {loading ? 'Sending…' : 'Send message'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <aside className="contact-side">
                <div className="contact-card">
                  <Mail size={20} />
                  <h4>Email</h4>
                  <p>hello@gathr.ph</p>
                </div>
                <div className="contact-card">
                  <MessageSquare size={20} />
                  <h4>Live chat</h4>
                  <p>9am – 8pm PHT, every day</p>
                </div>
                <div className="contact-card">
                  <Building2 size={20} />
                  <h4>HQ</h4>
                  <p>Cebu Business Park<br />Cebu City, 6000</p>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
