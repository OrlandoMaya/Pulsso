import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // En la app de Android (modo "mobile") los archivos ya van dentro del APK: sin service worker
      disable: mode === 'mobile',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Pulsso',
        short_name: 'Pulsso',
        description: 'Tu semana, tus rutinas, tus finanzas. Todo en un solo lugar.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#18181b',
        background_color: '#18181b',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Rutas de React: se sirven con el index.html cacheado; la API nunca pasa por la caché
        navigateFallback: '/index.html',
        // ...salvo la API y la descarga del APK, que deben llegar al servidor
        navigateFallbackDenylist: [/^\/api\//, /^\/downloads\//],
        // El lienzo de proyectos (React Flow) pesa: subir el límite para que también quede offline
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 4040,
    // En desarrollo, /api va al backend de Nest
    proxy: { '/api': 'http://localhost:4000' },
  },
}))
