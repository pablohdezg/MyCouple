import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Build alternativo: todo en un único archivo HTML.
 * Sirve para abrir la app desde un solo fichero, sin servidor.
 *   npx vite build --config vite.single.config.ts && node scripts/inline.mjs
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-single',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})
