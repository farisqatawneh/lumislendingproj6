import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Use base: '/client/' when building for cPanel (app at applications.lumislending.com/client/)
// Use base: '/' for Netlify (app at root)
const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  plugins: [react()],
  base,
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
