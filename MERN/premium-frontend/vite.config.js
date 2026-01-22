import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/auth': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/admin': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/booking': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/mail': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/kyc': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/ports': { target: 'http://127.0.0.1:5001', changeOrigin: true },
    }
  }
})
