import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Security measure #4: Content Security Policy
      // Prevents XSS by restricting which scripts/styles/resources can load.
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",   // unsafe-inline required by Vite HMR in dev
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",          // ws/wss for Vite HMR websocket
        "frame-ancestors 'none'",               // prevents clickjacking
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
})
