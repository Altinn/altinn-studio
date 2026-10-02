import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built deck can be served from any sub-path
// (file://, GitHub Pages, a shared folder on a presenter laptop, ...).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
