import { defineConfig, Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

function injectServiceWorkerManifest(): Plugin {
  return {
    name: 'inject-sw-manifest',
    apply: 'build',
    closeBundle() {
      const outDir = 'site';
      const swPath = join(outDir, 'service-worker.js');

      // Check if the service worker file exists
      if (!existsSync(outDir) || !existsSync(swPath)) {
        console.log('Service worker not yet built, skipping manifest injection');
        return;
      }

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

      if (allFiles.includes('/index.html') && !allFiles.includes('/')) {
        allFiles.push('/');
      }

      const hash = createHash('sha256');
      hash.update(allFiles.sort().join('\n'));
      const cacheVersion = hash.digest('hex').substring(0, 8);

      let swContent = readFileSync(swPath, 'utf-8');

      swContent = swContent.replace(
        '__CACHE_VERSION__',
        cacheVersion
      );
      swContent = swContent.replace(
        '__STATIC_ASSETS__',
        JSON.stringify(allFiles)
      );

      writeFileSync(swPath, swContent);

      console.log(`Service worker updated with ${allFiles.length} files, cache version: ${cacheVersion}`);
    }
  };
}

export default defineConfig({
  plugins: [svelte(), injectServiceWorkerManifest()],
  base: '/',
  resolve: {
    alias: {
      $lib: resolve(__dirname, './src/lib'),
    },
  },
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
