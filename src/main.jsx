import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ToastHost } from './components/ToastHost.jsx'

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <ToastHost />
  </>
)
