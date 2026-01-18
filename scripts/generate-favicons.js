#!/usr/bin/env node

/**
 * Generate PNG favicons from icon.svg
 * Uses Playwright (already a dev dependency) to render SVG to PNG
 */

import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

async function generateFavicons() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Read the SVG file
  const svgContent = readFileSync(join(publicDir, 'icon.svg'), 'utf-8');

  // Create HTML wrapper to render SVG
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; padding: 0; }
        svg { display: block; width: 100%; height: 100%; }
      </style>
    </head>
    <body>${svgContent}</body>
    </html>
  `;

  await page.setContent(html);

  // Generate 32x32 favicon
  await page.setViewportSize({ width: 32, height: 32 });
  const favicon32 = await page.screenshot({ type: 'png' });
  writeFileSync(join(publicDir, 'favicon-32x32.png'), favicon32);
  console.log('Generated favicon-32x32.png');

  // Generate 180x180 Apple touch icon
  await page.setViewportSize({ width: 180, height: 180 });
  const appleIcon = await page.screenshot({ type: 'png' });
  writeFileSync(join(publicDir, 'apple-touch-icon.png'), appleIcon);
  console.log('Generated apple-touch-icon.png');

  // Generate 192x192 for PWA manifest
  await page.setViewportSize({ width: 192, height: 192 });
  const icon192 = await page.screenshot({ type: 'png' });
  writeFileSync(join(publicDir, 'icon-192.png'), icon192);
  console.log('Generated icon-192.png');

  // Generate 512x512 for PWA manifest
  await page.setViewportSize({ width: 512, height: 512 });
  const icon512 = await page.screenshot({ type: 'png' });
  writeFileSync(join(publicDir, 'icon-512.png'), icon512);
  console.log('Generated icon-512.png');

  await browser.close();
  console.log('All favicons generated successfully!');
}

generateFavicons().catch((error) => {
  console.error('Error generating favicons:', error);
  process.exit(1);
});
