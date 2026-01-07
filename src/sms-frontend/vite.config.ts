import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // ============================================================
    // FIX: Force correct CSP Headers for Stripe & SignalR
    // ============================================================
    headers: {
      "Content-Security-Policy": 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network https://accounts.google.com https://gsi.client-resource-provider.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        // ALLOW STRIPE WORKERS (Fixes the blob: error)
        "worker-src 'self' blob: https://m.stripe.network; " +
        "child-src 'self' blob: https://m.stripe.network; " +
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com; " +
        // ALLOW SIGNALR & API (Fixes WebSocket error)
        "connect-src 'self' https://localhost:7084 wss://localhost:7084 http://localhost:5000 https://api.stripe.com https://maps.googleapis.com; " +
        "img-src 'self' data: https: blob:;"
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})