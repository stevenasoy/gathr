import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
const inputCls = "w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand"

export default function ForgotPassword() {
  const { resetPassword, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = await resetPassword(email)
      if (err) {
        setError(err.message || 'Could not send reset email. Please try again.')
      } else {
        setSent(true)
      }
    } catch (e) {
      console.error('reset password failed', e)
      setError('Could not send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <main className="min-h-[70vh] grid place-items-center py-[60px] px-5">
        <div className="max-w-[460px] mx-auto p-8 border border-line rounded-lg bg-white shadow-card">
          <h1 className="text-[26px] font-extrabold mb-2 text-center">Reset password</h1>
          <p className="text-center text-ink-soft text-[14.5px] mb-6">Enter your email and we'll send you a link to choose a new password.</p>

          {!configured && (
            <div className="bg-tint border border-line-strong text-ink-soft text-[13px] p-3 rounded-[10px] mb-[18px]">Accounts aren't connected yet. Add your Supabase keys to <code className="bg-white border border-line-strong rounded px-1.5 py-0.5 text-xs text-ink">.env</code> and restart the dev server.</div>
          )}

          {sent ? (
            <div className="mt-[18px]">
              <p>If an account exists for <b>{email}</b>, you'll receive a reset link shortly.</p>
              <Link to="/signin" className={baseBtn} style={{ display: 'inline-block', marginTop: 12 }}>Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="mb-3.5">
                <label className="block text-[13px] font-bold mb-1.5 text-ink">Email</label>
                <input required type="email" value={email} onChange={onChange} placeholder="you@email.com" className={inputCls} />
              </div>

              {error && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mb-3.5">{error}</div>}

              <button className={baseBtn} type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-center mt-[18px] text-sm text-ink-soft">Remember your password? <Link to="/signin" className="text-brand font-semibold hover:underline">Sign in</Link></p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
