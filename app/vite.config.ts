import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Capacitor は dist/ を相対パスで読むので base は './'
  base: './',
  test: {
    environment: 'node',
  },
})
