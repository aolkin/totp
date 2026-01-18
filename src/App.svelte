<script lang="ts">
  import { onMount } from 'svelte';
  import CreateForm from './components/CreateForm.svelte';
  import TotpDisplay from './components/TotpDisplay.svelte';
  import PassphrasePrompt from './components/PassphrasePrompt.svelte';
  import OfflineBanner from './components/OfflineBanner.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import CacheInfo from './components/CacheInfo.svelte';
  import {
    decodeFromURL,
    decrypt,
    tryDecryptWithEmptyPassphrase,
    type EncryptedData,
  } from './lib/crypto';
  import type { TOTPConfig } from './lib/types';
  import { Button } from '$lib/components/ui/button';

  type AppMode = 'create' | 'prompt' | 'display' | 'error';

  let mode = $state<AppMode>('create');
  let config = $state<TOTPConfig | undefined>(undefined);
  let encryptedData = $state<EncryptedData | undefined>(undefined);
  let promptError = $state('');
  let errorMessage = $state('');
  let showUpdateBanner = $state(false);
  let showSettings = $state(false);
  let deferredPrompt = $state<Event | undefined>(undefined);

  onMount(() => {
    void handleHashChange();
    const handler = () => {
      void handleHashChange();
    };
    window.addEventListener('hashchange', handler);

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener(
        'message',
        (event: MessageEvent<{ type?: string }>) => {
          if (event.data.type === 'SW_ACTIVATED') {
            // Service worker activated - banner will show automatically
            localStorage.setItem('cache_last_update', new Date().toISOString());
          }
        },
      );

      // Listen for updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        showUpdateBanner = true;
      });
    }

    // Listen for beforeinstallprompt event for PWA installation
    const beforeInstallHandler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', beforeInstallHandler);

    return () => {
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
    };
  });

  async function handleHashChange() {
    const hash = window.location.hash.slice(1);

    if (!hash) {
      mode = 'create';
      config = undefined;
      encryptedData = undefined;
      return;
    }

    try {
      encryptedData = decodeFromURL(hash);

      const result = await tryDecryptWithEmptyPassphrase(encryptedData);
      if (result) {
        config = result;
        mode = 'display';
      } else {
        mode = 'prompt';
        promptError = '';
      }
    } catch {
      errorMessage = 'Invalid URL. The data may be corrupted.';
      mode = 'error';
    }
  }

  async function handleUnlock(passphrase: string) {
    if (!encryptedData) return;

    try {
      config = await decrypt(encryptedData, passphrase);
      mode = 'display';
      promptError = '';
    } catch {
      promptError = 'Incorrect passphrase';
    }
  }

  function handleCreateNew() {
    window.location.hash = '';
  }

  async function handleInstall() {
    if (deferredPrompt) {
      const prompt = deferredPrompt as BeforeInstallPromptEvent;
      await prompt.prompt();
      await prompt.userChoice;
      deferredPrompt = undefined;
    }
  }

  function handleUpdate() {
    window.location.reload();
  }

  function handleDismissUpdate() {
    showUpdateBanner = false;
  }

  function toggleSettings() {
    showSettings = !showSettings;
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
</script>

<!-- Offline ready banner -->
<OfflineBanner onInstall={deferredPrompt ? handleInstall : undefined} />

<!-- Update available banner -->
<UpdateBanner visible={showUpdateBanner} onUpdate={handleUpdate} onDismiss={handleDismissUpdate} />

<main class="flex min-h-screen flex-col items-center p-4 font-sans">
  <header class="mb-8 text-center relative w-full max-w-2xl">
    <h1 class="text-2xl font-semibold">TOTP Authenticator</h1>
    <button
      onclick={toggleSettings}
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
    {#if mode === 'create'}
      <CreateForm />
    {:else if mode === 'prompt'}
      <PassphrasePrompt onUnlock={handleUnlock} error={promptError} />
    {:else if mode === 'display' && config}
      <TotpDisplay {config} onCreateNew={handleCreateNew} />
    {:else if mode === 'error'}
      <div class="text-center p-8">
        <p class="text-destructive mb-4">{errorMessage}</p>
        <Button onclick={handleCreateNew}>Go Back</Button>
      </div>
    {/if}
  </div>
</main>
