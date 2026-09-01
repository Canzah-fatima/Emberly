import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { NotificationsProvider } from './context/NotificationsContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </ToastProvider>
      </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
