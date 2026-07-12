import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

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
      <main className="auth-page">
        <div className="form-card">
          <h1>Choose a new password</h1>
          <p className="form-sub">Your reset link is valid for one hour.</p>

          {!configured && (
            <div className="form-notice">Accounts aren't connected yet. Add your Supabase keys to <code>.env</code> and restart the dev server.</div>
          )}

          {done ? (
            <div className="form-success" style={{ marginTop: 18 }}>
              <p>Password updated. Redirecting you to sign in…</p>
              <Link to="/signin" className="btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>Sign in now</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="form-row">
                <label>New password</label>
                <input required type="password" minLength={6} value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-row">
                <label>Confirm password</label>
                <input required type="password" value={confirm} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)} placeholder="••••••••" />
              </div>

              {error && <div className="form-error">{error}</div>}

              <button className="btn-primary" type="submit" disabled={loading || !user}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
              <p className="form-foot">Need a new link? <Link to="/forgot-password">Request another</Link></p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
