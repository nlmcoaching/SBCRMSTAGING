import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read FRONTEND_SECRET from backend/.env so it is injected by the Vite proxy
  // (Node process) and never compiled into the browser bundle.
  const backendEnv = loadEnv(mode, 'backend', '');
  const frontendSecret = backendEnv.FRONTEND_SECRET || process.env.FRONTEND_SECRET || '';

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy /api requests to the backend — avoids CORS and keeps FRONTEND_SECRET
        // out of the browser bundle entirely (injected here, server-side).
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          headers: {
            'Origin': 'http://localhost:5173',
            ...(frontendSecret ? { 'x-frontend-secret': frontendSecret } : {}),
          },
        },
      },
      headers: {
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "connect-src 'self' ws: wss: http://localhost:3001",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    },
  };
})
