import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageSquare, Building2 } from 'lucide-react'
import Footer from '../components/Footer'

type ContactForm = { name: string; email: string; topic: string; message: string }

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
const inputCls = "w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/15"

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
        <section className="py-14 pb-10 bg-surface border-b border-line text-center">
          <div className="wrap relative z-[1]">
            <span className="inline-block text-xs font-bold tracking-[0.14em] uppercase text-brand mb-3">Contact</span>
            <h1 className="text-[clamp(30px,4vw,44px)] font-extrabold max-w-[760px] mx-auto leading-[1.1]">Talk to a human.</h1>
            <p className="text-ink-soft text-[17px] max-w-[620px] mx-auto mt-4">Most messages get a reply within an hour during PHT business hours. For urgent bookings, use the help center search first.</p>
          </div>
        </section>

        <div className="wrap page-body">
          <section>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8 items-start max-w-[920px] mx-auto">
              <div className="p-7 sm:p-8 border border-line rounded-lg bg-white shadow-card">
                {submitted ? (
                  <div className="text-center py-6 px-0">
                    <h2 className="text-[22px] font-extrabold mb-2">Got it.</h2>
                    <p className="text-ink-soft max-w-[380px] mx-auto mb-5 text-[15px] leading-relaxed">Thanks {form.name.split(' ')[0]}. Our team will reply to {form.email} shortly.</p>
                    <Link to="/" className="font-semibold text-[13px] text-brand hover:underline">Back to home</Link>
                  </div>
                ) : (
                  <>
                    <h2 className="text-[20px] font-extrabold mb-1">Send us a message</h2>
                    <p className="text-ink-soft text-[14px] mb-5">We'll get back to you within an hour during PHT business hours.</p>
                    <form onSubmit={onSubmit}>
                      <div className="mb-3.5">
                        <label className="block text-[13px] font-bold mb-1.5 text-ink">Name</label>
                        <input required value={form.name} onChange={onChange('name')} placeholder="Your name" className={inputCls} />
                      </div>
                      <div className="mb-3.5">
                        <label className="block text-[13px] font-bold mb-1.5 text-ink">Email</label>
                        <input required type="email" value={form.email} onChange={onChange('email')} placeholder="you@email.com" className={inputCls} />
                      </div>
                      <div className="mb-3.5">
                        <label className="block text-[13px] font-bold mb-1.5 text-ink">Topic</label>
                        <select value={form.topic} onChange={onChange('topic')} className={inputCls}>
                          <option value="general">General question</option>
                          <option value="booking">Booking support</option>
                          <option value="hosting">Host question</option>
                          <option value="press">Press / media</option>
                          <option value="careers">Careers application</option>
                        </select>
                      </div>
                      <div className="mb-3.5">
                        <label className="block text-[13px] font-bold mb-1.5 text-ink">Message</label>
                        <textarea required value={form.message} onChange={onChange('message')} placeholder="How can we help?" className={`${inputCls} resize-y min-h-[110px]`} />
                      </div>
                      {error && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mb-3.5">{error}</div>}
                      <button className={baseBtn} type="submit" disabled={loading}>
                        {loading ? 'Sending…' : 'Send message'}
                      </button>
                    </form>
                  </>
                )}
              </div>

              <aside className="grid gap-3 content-start">
                <h2 className="text-[20px] font-extrabold mb-1 sr-only">Reach us directly</h2>
                <div className="p-5 border border-line rounded-lg bg-surface">
                  <Mail size={20} className="text-brand mb-2.5" />
                  <h4 className="text-sm font-bold mb-1">Email</h4>
                  <p className="text-ink-soft text-sm m-0 leading-relaxed">hello@gathr.ph</p>
                </div>
                <div className="p-5 border border-line rounded-lg bg-surface">
                  <MessageSquare size={20} className="text-brand mb-2.5" />
                  <h4 className="text-sm font-bold mb-1">Live chat</h4>
                  <p className="text-ink-soft text-sm m-0 leading-relaxed">9am – 8pm PHT, every day</p>
                </div>
                <div className="p-5 border border-line rounded-lg bg-surface">
                  <Building2 size={20} className="text-brand mb-2.5" />
                  <h4 className="text-sm font-bold mb-1">HQ</h4>
                  <p className="text-ink-soft text-sm m-0 leading-relaxed">Cebu Business Park<br />Cebu City, 6000</p>
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
