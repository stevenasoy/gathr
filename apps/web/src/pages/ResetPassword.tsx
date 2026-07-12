import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
const inputCls = "w-full py-3 px-3.5 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none focus:border-brand"

export default function ResetPassword() {
  const { updatePassword, configured, user } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  // Once Supabase has processed the recovery hash and signed the user in, let
  // them set the new password. If there's no authenticated session, the link
  // may have expired or already been used.
  useEffect(() => {
    if (!configured) return
    if (user) return
    // detectSessionInUrl already ran at client init; give it a moment if this
    // page was opened directly from the recovery email.
    const t = setTimeout(() => {
      if (!user) setError('This reset link has expired or already been used. Please request a new one.')
    }, 1500)
    return () => clearTimeout(t)
  }, [configured, user])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { error: err } = await updatePassword(password)
      if (err) {
        setError(err.message || 'Could not update password. Please try again.')
      } else {
        setDone(true)
        setTimeout(() => navigate('/signin'), 2000)
      }
    } catch (e) {
      console.error('update password failed', e)
      setError('Could not update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <main className="min-h-[70vh] grid place-items-center py-[60px] px-5">
        <div className="max-w-[460px] mx-auto p-8 border border-line rounded-lg bg-white shadow-card">
          <h1 className="text-[26px] font-extrabold mb-2 text-center">Choose a new password</h1>
          <p className="text-center text-ink-soft text-[14.5px] mb-6">Your reset link is valid for one hour.</p>

          {!configured && (
            <div className="bg-tint border border-line-strong text-ink-soft text-[13px] p-3 rounded-[10px] mb-[18px]">Accounts aren't connected yet. Add your Supabase keys to <code className="bg-white border border-line-strong rounded px-1.5 py-0.5 text-xs text-ink">.env</code> and restart the dev server.</div>
          )}

          {done ? (
            <div className="mt-[18px]">
              <p>Password updated. Redirecting you to sign in…</p>
              <Link to="/signin" className={baseBtn} style={{ display: 'inline-block', marginTop: 12 }}>Sign in now</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="mb-3.5">
                <label className="block text-[13px] font-bold mb-1.5 text-ink">New password</label>
                <input required type="password" minLength={6} value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
              </div>
              <div className="mb-3.5">
                <label className="block text-[13px] font-bold mb-1.5 text-ink">Confirm password</label>
                <input required type="password" value={confirm} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)} placeholder="••••••••" className={inputCls} />
              </div>

              {error && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mb-3.5">{error}</div>}

              <button className={baseBtn} type="submit" disabled={loading || !user}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
              <p className="text-center mt-[18px] text-sm text-ink-soft">Need a new link? <Link to="/forgot-password" className="text-brand font-semibold hover:underline">Request another</Link></p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
