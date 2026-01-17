<script lang="ts">
  import { onMount } from 'svelte';
  import CreateForm from './components/CreateForm.svelte';
  import TotpDisplay from './components/TotpDisplay.svelte';
  import PassphrasePrompt from './components/PassphrasePrompt.svelte';
  import { decodeFromURL, decrypt, tryDecryptWithEmptyPassphrase, type EncryptedData } from './lib/crypto';
  import type { TOTPConfig } from './lib/types';

  type AppMode = 'create' | 'prompt' | 'display' | 'error';

  let mode = $state<AppMode>('create');
  let config = $state<TOTPConfig | undefined>(undefined);
  let encryptedData = $state<EncryptedData | undefined>(undefined);
  let promptError = $state('');
  let errorMessage = $state('');

  onMount(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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

<main>
  <header>
    <h1>TOTP Authenticator</h1>
  </header>

  <div class="content">
    {#if mode === 'create'}
      <CreateForm />
    {:else if mode === 'prompt'}
      <PassphrasePrompt onUnlock={handleUnlock} error={promptError} />
    {:else if mode === 'display' && config}
      <TotpDisplay {config} onCreateNew={handleCreateNew} />
    {:else if mode === 'error'}
      <div class="error-page">
        <p>{errorMessage}</p>
        <button onclick={handleCreateNew}>Go Back</button>
      </div>
    {/if}
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: #fafafa;
  }

  header {
    margin-bottom: 2rem;
    text-align: center;
  }

  h1 {
    font-size: 1.5rem;
    color: #333;
    margin: 0;
  }

  .content {
    display: flex;
    justify-content: center;
    width: 100%;
    padding: 1rem;
  }

  .error-page {
    text-align: center;
    padding: 2rem;
  }

  .error-page p {
    color: #c00;
    margin-bottom: 1rem;
  }

  .error-page button {
    padding: 0.75rem 1.5rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .error-page button:hover {
    background: #0052a3;
  }
</style>
