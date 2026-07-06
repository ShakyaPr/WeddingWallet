import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The SPA calls same-origin `/api/*`, which in production is served by
// Cloudflare Pages Functions. In local dev we run `wrangler pages dev` on
// port 8788 (see `npm run dev:api`) and proxy `/api` to it.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
