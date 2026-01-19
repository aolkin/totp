import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { requestPersistentStorage } from './lib/offline';

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
