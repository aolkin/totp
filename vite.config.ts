import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
      },
      manifest: false, // We have static/manifest.json
      injectRegister: false,
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  define: {
    __COMMIT_HASH__: JSON.stringify(process.env.VITE_COMMIT_HASH ?? 'dev'),
  },
});
