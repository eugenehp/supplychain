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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@xenova/transformers')) return 'transformers';
          if (id.includes('node_modules/d3-')) return 'd3';
          if (id.includes('node_modules/jspdf')) return 'pdf';
          if (id.includes('/SankeyChart.svelte')) return 'chart-sankey';
          if (id.includes('/SupplyMapChart.svelte')) return 'chart-map';
          if (id.includes('/PackChart.svelte')) return 'chart-pack';
          if (id.includes('/RadialTreeChart.svelte')) return 'chart-radial';
          if (id.includes('/workers/rag.worker')) return 'rag-worker';
        },
      },
    },
  },
})
