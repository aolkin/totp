import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
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
  define: {
    __COMMIT_HASH__: JSON.stringify(process.env.VITE_COMMIT_HASH ?? 'dev'),
  },
});
