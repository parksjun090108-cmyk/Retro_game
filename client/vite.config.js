import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/strike-wing': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/metro-pacman': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
