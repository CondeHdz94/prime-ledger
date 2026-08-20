import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages sirve el sitio bajo /prime-ledger/
  base: process.env.GITHUB_PAGES ? '/prime-ledger/' : '/',
})
