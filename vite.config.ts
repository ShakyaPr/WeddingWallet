import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The SPA calls same-origin `/api/*`. In production the Node server
// (server/index.ts) serves both the built SPA and the API from one port.
// In local dev the API runs separately (`npm run dev:api`, port 3000) and
// Vite proxies `/api` to it.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
