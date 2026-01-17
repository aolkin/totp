<script lang="ts">
  import { onMount } from 'svelte';
  import CreateForm from './components/CreateForm.svelte';
  import TotpDisplay from './components/TotpDisplay.svelte';
  import PassphrasePrompt from './components/PassphrasePrompt.svelte';
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

  onMount(() => {
    void handleHashChange();
    const handler = () => {
      void handleHashChange();
    };
    window.addEventListener('hashchange', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
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
</script>

<main class="flex min-h-screen flex-col items-center p-4 font-sans">
  <header class="mb-8 text-center">
    <h1 class="text-2xl font-semibold">TOTP Authenticator</h1>
  </header>

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
