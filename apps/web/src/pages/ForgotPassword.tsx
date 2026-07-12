import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

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
      <main className="auth-page">
        <div className="form-card">
          <h1>Reset password</h1>
          <p className="form-sub">Enter your email and we'll send you a link to choose a new password.</p>

          {!configured && (
            <div className="form-notice">Accounts aren't connected yet. Add your Supabase keys to <code>.env</code> and restart the dev server.</div>
          )}

          {sent ? (
            <div className="form-success" style={{ marginTop: 18 }}>
              <p>If an account exists for <b>{email}</b>, you'll receive a reset link shortly.</p>
              <Link to="/signin" className="btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="form-row">
                <label>Email</label>
                <input required type="email" value={email} onChange={onChange} placeholder="you@email.com" />
              </div>

              {error && <div className="form-error">{error}</div>}

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="form-foot">Remember your password? <Link to="/signin">Sign in</Link></p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
