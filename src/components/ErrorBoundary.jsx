import { Component } from 'react'

// Catches render-time errors so a crash shows a recovery screen instead of a
// blank white page. Class component because error boundaries can't be hooks.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Something went wrong</h1>
        <p style={{ color: '#6b6770', maxWidth: 420 }}>
          The page hit an unexpected error. Reloading usually fixes it.
        </p>
        <button
          onClick={() => { this.setState({ error: null }); window.location.assign('/') }}
          style={{ padding: '12px 22px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, color: '#fff', background: 'linear-gradient(100deg, #6c2bd9, #e0218a)' }}
        >
          Back to home
        </button>
      </div>
    )
  }
}
