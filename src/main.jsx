import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ToastHost } from './components/ToastHost.jsx'
import { AppErrorBoundary } from './components/modals.jsx'

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
    <ToastHost />
  </AppErrorBoundary>
)
