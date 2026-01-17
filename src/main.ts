import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  target: document.getElementById('app')!,
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error: unknown) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

export default app;
