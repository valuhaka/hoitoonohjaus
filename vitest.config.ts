import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Tests run without the Cloudflare plugin of vite.config.ts, which cannot share a server with vitest
export default defineConfig({
  plugins: [react()],
})
