import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { SavedProvider } from './context/SavedContext'
import { VenuesProvider } from './context/VenuesContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { ModeProvider } from './context/ModeContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ModeProvider>
        <AuthProvider>
          <VenuesProvider>
            <SavedProvider>
              <NotificationsProvider>
                <ErrorBoundary>
                  <App />
                </ErrorBoundary>
              </NotificationsProvider>
            </SavedProvider>
          </VenuesProvider>
        </AuthProvider>
      </ModeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)