import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

type SignUpForm = { name: string; email: string; password: string }

export default function SignUp() {
  const { signUp, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'
  const [form, setForm] = useState<SignUpForm>({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const onChange = (k: keyof SignUpForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const { data, error } = await signUp(form)
      if (error) { setError(error.message); return }
      // If email confirmation is ON, there's no active session yet.
      if (data?.session) navigate(from, { replace: true })
      else setConfirm(true)
    } catch (e) {
      console.error('sign up failed', e)
      setError('Could not create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <main className="auth-page">
        <div className="form-card">
          {confirm ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <h2>Check your email, {form.name.split(' ')[0]}.</h2>
              <p>We sent a confirmation link to {form.email}. Click it to activate your account, then sign in.</p>
              <Link to="/signin" state={{ from }} className="btn-primary" style={{ width: 'auto', padding: '13px 22px', display: 'inline-block' }}>Go to sign in</Link>
            </div>
          ) : (
            <>
              <h1>Create your account</h1>
              <p className="form-sub">Free forever. No card required.</p>

              {!configured && (
                <div className="form-notice">Accounts aren't connected yet. Add your Supabase keys to <code>.env</code> and restart the dev server.</div>
              )}

              <form onSubmit={onSubmit}>
                <div className="form-row">
                  <label>Full name</label>
                  <input required value={form.name} onChange={onChange('name')} placeholder="Mara R." />
                </div>
                <div className="form-row">
                  <label>Email</label>
                  <input required type="email" value={form.email} onChange={onChange('email')} placeholder="you@email.com" />
                </div>
                <div className="form-row">
                  <label>Password</label>
                  <input required type="password" minLength={8} value={form.password} onChange={onChange('password')} placeholder="At least 8 characters" />
                </div>

                {error && <div className="form-error">{error}</div>}

                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
                <p className="form-foot">Already have an account? <Link to="/signin" state={{ from }}>Sign in</Link></p>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
