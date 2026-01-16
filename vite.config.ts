import { defineConfig, Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

function injectServiceWorkerManifest(): Plugin {
  return {
    name: 'inject-sw-manifest',
    apply: 'build',
    closeBundle() {
      const outDir = 'site';
      const swPath = join(outDir, 'service-worker.js');

      // Collect all files to cache
      const collectFiles = (dir: string, baseDir: string = dir): string[] => {
        const files: string[] = [];
        const entries = readdirSync(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            files.push(...collectFiles(fullPath, baseDir));
          } else {
            const relativePath = '/' + fullPath.substring(baseDir.length + 1);
            files.push(relativePath);
          }
        }

        return files;
      };

      const allFiles = collectFiles(outDir);

      // Generate cache version from file list hash
      const hash = createHash('sha256');
      hash.update(allFiles.sort().join('\n'));
      const cacheVersion = hash.digest('hex').substring(0, 8);

      // Read service worker
      let swContent = readFileSync(swPath, 'utf-8');

      // Replace placeholders
      swContent = swContent.replace(
        '__CACHE_VERSION__',
        cacheVersion
      );
      swContent = swContent.replace(
        '__STATIC_ASSETS__',
        JSON.stringify(allFiles)
      );

      // Write back
      writeFileSync(swPath, swContent);

      console.log(`Service worker updated with ${allFiles.length} files, cache version: ${cacheVersion}`);
    }
  };
}

export default defineConfig({
  plugins: [svelte(), injectServiceWorkerManifest()],
  base: '/',
  build: {
    outDir: 'site',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sw: resolve(__dirname, 'src/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'sw') {
            return 'service-worker.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
