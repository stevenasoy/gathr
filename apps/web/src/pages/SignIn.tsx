import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

type SignInForm = { email: string; password: string }

export default function SignIn() {
  const { signIn, configured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'
  const [form, setForm] = useState<SignInForm>({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
    <>
      <main className="auth-page">
        <div className="form-card">
          <h1>Sign in</h1>
          <p className="form-sub">Welcome back to Gathr.</p>

          {!configured && (
            <div className="form-notice">Accounts aren't connected yet. Add your Supabase keys to <code>.env</code> and restart the dev server.</div>
          )}

          <form onSubmit={onSubmit}>
            <div className="form-row">
              <label>Email</label>
              <input required type="email" value={form.email} onChange={onChange('email')} placeholder="you@email.com" />
            </div>
            <div className="form-row">
              <label>Password</label>
              <input required type="password" value={form.password} onChange={onChange('password')} placeholder="••••••••" />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="form-foot">New to Gathr? <Link to="/signup" state={{ from }}>Create an account</Link></p>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
