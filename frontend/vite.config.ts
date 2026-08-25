import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      // The app calls /api/... on its own origin; in dev that origin is Vite, so
      // proxy it to the backend. Keeps VITE_API_URL unset (and CORS out of the
      // picture) for local work. /media is the same deal: uploaded images are
      // served by the API, not from public/.
      proxy: Object.fromEntries(
        ['/api', '/media'].map((path) => [
          path,
          { target: env.VITE_API_PROXY || 'http://127.0.0.1:8000', changeOrigin: true },
        ]),
      ),
    },
  }
})
