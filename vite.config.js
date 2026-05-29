import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  publicDir: 'static',
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
})
