import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        globIgnores: ['registerSW.js'],
      },
      injectRegister: null, // Don't generate registerSW.js
      manifest: false, // We already have public/manifest.json
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: '/',
  resolve: {
    alias: {
      $lib: resolve(__dirname, './src/lib'),
    },
  },
  build: {
    outDir: 'site',
    emptyOutDir: true,
  },
});
