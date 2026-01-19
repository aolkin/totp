import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { requestPersistentStorage } from './lib/offline';

// Set up dark mode detection
function updateDarkMode() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Apply initial dark mode
updateDarkMode();

// Listen for changes to system dark mode preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkMode);

const app = mount(App, {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  target: document.getElementById('app')!,
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(async (registration) => {
        // Request persistent storage when service worker is ready
        if (registration.active) {
          await requestPersistentStorage();
        } else {
          // Wait for the service worker to become active
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  void requestPersistentStorage();
                }
              });
            }
          });
        }
      })
      .catch((error: unknown) => {
        console.error('Service worker registration failed:', error);
      });
  });
}

export default app;
