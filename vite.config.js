import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// PWA wird in v0.2.0 ergänzt sobald workbox-build Kompatibilität geklärt ist
export default defineConfig({
  plugins: [svelte()],
  build: { chunkSizeWarningLimit: 600 }
})
