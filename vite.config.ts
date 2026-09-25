import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Shared proxy config — used by both `server` (npm run dev) and
// `preview` (npm run preview) so behaviour is identical in both.
const backendProxy = {
  '/api': {
    target: 'https://api.flexgig.com.ng',
    changeOrigin: true,
    secure: true,
    // Rewrite the Set-Cookie domain so the browser treats the cookie
    // as belonging to localhost, not api.flexgig.com.ng.
    // Without this, Chrome drops the cookie for cross-origin requests.
    cookieDomainRewrite: '',
  },
  '/auth': {
    target: 'https://api.flexgig.com.ng',
    changeOrigin: true,
    secure: true,
    cookieDomainRewrite: '',
  },
  '/webauthn': {
    target: 'https://api.flexgig.com.ng',
    changeOrigin: true,
    secure: true,
    cookieDomainRewrite: '',
  },
  '/reauth': {                                    // ← NEW
    target: 'https://api.flexgig.com.ng',
    changeOrigin: true,
    secure: true,
    cookieDomainRewrite: '',
  },
} as const

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null, // we register manually in main.tsx
      manifest: {
        id: '/',
        name: 'FlexGig — Cheap Data Plug',
        short_name: 'FlexGig',
        description:
          'Get affordable data, convert excess airtime to cash, and pay utility bills.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#080808',
        background_color: '#080808',
        categories: ['finance', 'utilities', 'business'],
        icons: [
          { src: '/pwa/logo-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa/logo-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa/logo-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa/logo.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/pwa/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      devOptions: {
        enabled: true, // allows testing SW on localhost during dev
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true, // allow LAN access
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.app',
      '.ngrok.io',
      '.ngrok-free.dev',
    ],
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
    proxy: backendProxy,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: [
      '.ngrok-free.app',
      '.ngrok.app',
      '.ngrok.io',
      '.ngrok-free.dev',
    ],
    proxy: backendProxy,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          api: ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})