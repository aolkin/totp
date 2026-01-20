<script lang="ts">
  import { onMount } from 'svelte';
  import CreateForm from './components/CreateForm.svelte';
  import TotpDisplay from './components/TotpDisplay.svelte';
  import PassphrasePrompt from './components/PassphrasePrompt.svelte';
  import TotpList from './components/TotpList.svelte';
  import OfflineBanner from './components/OfflineBanner.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import CacheInfo from './components/CacheInfo.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import {
    decodeFromURL,
    decrypt,
    tryDecryptWithEmptyPassphrase,
    type EncryptedData,
  } from './lib/crypto';
  import type { TOTPConfig, TOTPRecord } from './lib/types';
  import { totpStorage } from './lib/storage';
  import { Button } from '$lib/components/ui/button';

  type AppMode = 'list' | 'create' | 'prompt' | 'display' | 'error';

  let mode = $state<AppMode>('list');
  let config = $state<TOTPConfig | undefined>(undefined);
  let encryptedData = $state<EncryptedData | undefined>(undefined);
  let promptError = $state('');
  let errorMessage = $state('');
  let showSettings = $state(false);
  let currentRecord = $state<TOTPRecord | undefined>(undefined);

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
      currentRecord = undefined;
      mode = 'list';
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

      if (currentRecord) {
        await totpStorage.updateLastUsed(currentRecord.id);
      }
    } catch {
      promptError = 'Incorrect passphrase';
    }
  }

  function handleCreateNew() {
    window.location.hash = '';
  }

  function handleUpdate() {
    window.location.reload();
  }

  function handleAddNew() {
    currentRecord = undefined;
    mode = 'create';
  }

  function handleBackToList() {
    currentRecord = undefined;
    window.location.hash = '';
  }

  function handleSaved() {
    mode = 'list';
  }

  async function handleViewRecord(record: TOTPRecord) {
    try {
      currentRecord = record;

      encryptedData = record.encrypted;
      const result = await tryDecryptWithEmptyPassphrase(record.encrypted);
      if (result) {
        config = result;
        mode = 'display';
        await totpStorage.updateLastUsed(record.id);
      } else {
        mode = 'prompt';
        promptError = '';
      }
    } catch (error) {
      console.error('Failed to view TOTP record', error);
      errorMessage = 'Failed to open record. Please try again.';
      mode = 'error';
    }
  }
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
    {#if mode === 'list'}
      <TotpList onView={handleViewRecord} onAdd={handleAddNew} />
    {:else if mode === 'create'}
      <CreateForm onSaved={handleSaved} onBack={handleBackToList} showBackButton={true} />
    {:else if mode === 'prompt'}
      <PassphrasePrompt
        onUnlock={handleUnlock}
        onBack={currentRecord ? handleBackToList : undefined}
        error={promptError}
        label={currentRecord?.label}
        hint={currentRecord?.passphraseHint}
      />
    {:else if mode === 'display' && config}
      <TotpDisplay
        {config}
        onCreateNew={handleCreateNew}
        onBackToList={handleBackToList}
        record={currentRecord}
        encryptedData={currentRecord ? undefined : encryptedData}
      />
    {:else if mode === 'error'}
      <div class="text-center p-8">
        <p class="text-destructive mb-4">{errorMessage}</p>
        <Button onclick={handleCreateNew}>Go Back</Button>
      </div>
    {/if}
  </div>
</main>
