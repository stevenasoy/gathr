import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

// Catches render-time errors so a crash shows a recovery screen instead of a
// blank white page. Class component because error boundaries can't be hooks.
// Mount with a `key` tied to the route pathname so navigation resets the
// boundary (clears the error state) when the user moves to another route.
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render error caught by ErrorBoundary:', error, info)
  }

  reset = (): void => this.setState({ error: null })

  override render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Something went wrong</h1>
        <p style={{ color: '#6b6770', maxWidth: 420 }}>
          The page hit an unexpected error. Reloading usually fixes it.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={this.reset}
            style={{ padding: '12px 22px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, color: '#fff', background: 'linear-gradient(100deg, #6c2bd9, #e0218a)' }}
          >
            Try again
          </button>
          <button
            onClick={() => { this.setState({ error: null }); window.location.assign('/') }}
            style={{ padding: '12px 22px', borderRadius: 999, border: '1px solid #e7e3ee', cursor: 'pointer', fontWeight: 600, color: '#3a3543', background: '#fff' }}
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }
}