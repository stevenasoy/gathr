import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SavedProvider } from './context/SavedContext.jsx'
import { VenuesProvider } from './context/VenuesContext.jsx'
import { NotificationsProvider } from './context/NotificationsContext.jsx'
import { ModeProvider } from './context/ModeContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
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
