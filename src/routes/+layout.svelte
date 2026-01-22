<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import OfflineBanner from '$lib/components/OfflineBanner.svelte';
  import UpdateBanner from '$lib/components/UpdateBanner.svelte';
  import CacheInfo from '$lib/components/CacheInfo.svelte';
  import { requestPersistentStorage } from '$lib/offline';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();

  let showSettings = $state(false);

  function handleUpdate() {
    window.location.reload();
  }

  onMount(() => {
    if ('serviceWorker' in navigator) {
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
    }
  });
</script>

<Toaster />
<OfflineBanner />
<UpdateBanner onUpdate={handleUpdate} />

<main class="flex min-h-screen flex-col items-center p-4 font-sans">
  <header class="mb-8 text-center relative w-full max-w-2xl">
    <h1 class="text-2xl font-semibold">TOTP Authenticator</h1>
    <button
      onclick={() => (showSettings = !showSettings)}
      class="absolute right-0 top-0 text-sm text-muted-foreground hover:text-foreground"
      aria-label="Settings"
    >
      ⚙️
    </button>
  </header>

  {#if showSettings}
    <div class="w-full max-w-2xl mb-8">
      <CacheInfo />
    </div>
  {/if}

  <div class="flex w-full justify-center p-4">
    {@render children()}
  </div>
</main>
