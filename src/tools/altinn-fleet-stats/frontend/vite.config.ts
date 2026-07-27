import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Workbox precaches the built assets so the UI works offline once loaded
      workbox: {
        // Don't precache the large dataset endpoints — API responses change.
        // We let the network fetch them; the dashboard becomes "stale offline".
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // SSE / event-stream endpoints must never be cached — passthrough only
            urlPattern: ({ url }) =>
              url.pathname === '/api/operation-events' ||
              url.pathname === '/api/fetch' ||
              url.pathname === '/api/scan',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fleet-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Altinn Studio Fleet Statistics',
        short_name: 'Fleet Stats',
        description:
          'Statistikk over Altinn 3-apper i prod og tt02 — komponentbruk, språk, prosesssteg, innstillinger.',
        theme_color: '#005db1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        lang: 'nb-NO',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:9091',
    },
  },
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
});
