import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api to the backend. Target defaults to the API's own default PORT
// (3001); override with VITE_API_URL when running the API on a different port.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://127.0.0.1:3001'
  return {
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false, // no source maps in production
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  }
})