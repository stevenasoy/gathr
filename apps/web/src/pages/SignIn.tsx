import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

type SignInForm = { email: string; password: string }

const baseBtn = "w-full bg-brand text-white font-bold text-[15px] py-3 px-7 rounded-full border border-white/[0.08] shadow-card transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center gap-2 hover:bg-brand-press hover:shadow-[0_8px_24px_rgba(194,90,30,0.25)] hover:-translate-y-px active:translate-y-px active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
const fieldWrap = "relative"
const inputCls = "w-full py-3 pl-11 pr-11 border border-line-strong rounded-xl font-[inherit] text-sm bg-white text-ink outline-none transition-colors duration-150 focus:border-brand focus:ring-2 focus:ring-brand/15"

export default function SignIn() {
  const { signIn, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'
  const [form, setForm] = useState<SignInForm>({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const onChange = (k: keyof SignInForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const { error } = await signIn(form)
      if (error) { setError(error.message); return }
      navigate(from, { replace: true })
    } catch (e) {
      console.error('sign in failed', e)
      setError('Could not sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout mode="signin">
      <div className="mb-4">
        <h1 className="text-[22px] font-extrabold mb-1 leading-tight">Sign in</h1>
        <p className="text-ink-soft text-[14px]">Welcome back to Gathr.</p>
      </div>

      {!configured && (
        <div className="bg-tint border border-line-strong text-ink-soft text-[13px] p-3 rounded-[10px] mb-5">Accounts aren't connected yet. Add your Supabase keys to <code className="bg-white border border-line-strong rounded px-1.5 py-0.5 text-xs text-ink">.env</code> and restart the dev server.</div>
      )}

      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label className="block text-[13px] font-bold mb-1.5 text-ink" htmlFor="signin-email">Email</label>
          <div className={fieldWrap}>
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input id="signin-email" required type="email" value={form.email} onChange={onChange('email')} placeholder="you@email.com" className={inputCls} autoComplete="email" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-[13px] font-bold mb-1.5 text-ink" htmlFor="signin-password">Password</label>
          <div className={fieldWrap}>
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input id="signin-password" required type={showPw ? 'text' : 'password'} value={form.password} onChange={onChange('password')} placeholder="••••••••" className={inputCls} autoComplete="current-password" />
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors duration-150 p-0 bg-transparent border-0 cursor-pointer">
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <Link to="/forgot-password" className="text-[13px] text-brand font-semibold hover:underline">Forgot password?</Link>
        </div>

        {error && <div className="bg-[#fdecef] border border-[#f5c2cd] text-[#a01230] text-[13.5px] p-2.5 px-3.5 rounded-[10px] mb-4">{error}</div>}

        <button className={baseBtn} type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center mt-5 text-sm text-ink-soft">
          New to Gathr? <Link to="/signup" state={{ from }} className="text-brand font-semibold hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  )
}