import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 700 }, // o recharts sozinho passa de 500 kB
  // Em desenvolvimento (npm run dev) o /api vai para o backend local.
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
