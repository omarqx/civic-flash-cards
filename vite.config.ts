import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// vite.config runs under Node; avoid requiring @types/node for one env read
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  root: '.',
  base: '/civic-flash-cards/',
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['favicon.svg'],
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/audio\/.+\.mp3(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'card-audio',
              rangeRequests: true, // iOS Safari fetches audio with Range requests
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Civic Flash Cards — USCIS Naturalization Test',
        short_name: 'CivicCards',
        description: 'Master the 128 USCIS Naturalization Civics Test questions with spaced repetition.',
        theme_color: '#F7F3EA',
        background_color: '#F7F3EA',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
