import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API = process.env.VITE_API_URL || 'http://100.97.142.96:3003'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/portal': { target: API, changeOrigin: true },
      '/admin': { target: API, changeOrigin: true },
    },
  },
  base: process.env.VITE_BASE_PATH || '/',
  build: { outDir: 'dist', sourcemap: false },
})
