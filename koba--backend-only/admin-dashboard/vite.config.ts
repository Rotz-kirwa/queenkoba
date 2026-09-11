import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('recharts')) {
            return 'charts'
          }

          if (id.includes('@tanstack/react-query')) {
            return 'query'
          }

          if (id.includes('lucide-react') || id.includes('framer-motion') || id.includes('date-fns')) {
            return 'ui-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5174,
  },
})
