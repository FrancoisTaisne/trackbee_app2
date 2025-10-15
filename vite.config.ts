import { defineConfig } from 'vitest/config'   // <-- AU LIEU DE 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(rootDir, './src'),
      '@/app': resolve(rootDir, './src/app'),
      '@/features': resolve(rootDir, './src/features'),
      '@/shared': resolve(rootDir, './src/shared'),
      '@/core': resolve(rootDir, './src/core'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5180,
    proxy: {
      '/api': { target: 'http://localhost:3313', changeOrigin: true, secure: false },
    },
  },
})
