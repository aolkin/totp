<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import TotpDisplay from '$lib/components/TotpDisplay.svelte';
  import PassphrasePrompt from '$lib/components/PassphrasePrompt.svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    decodeFromURL,
    decrypt,
    tryDecryptWithEmptyPassphrase,
    type EncryptedData,
  } from '$lib/crypto';
  import type { TOTPConfig, TOTPRecord } from '$lib/types';
  import { totpStorage } from '$lib/storage';

  type ViewMode = 'loading' | 'prompt' | 'display' | 'error';

  let mode = $state<ViewMode>('loading');
  let config = $state<TOTPConfig | undefined>(undefined);
  let encryptedData = $state<EncryptedData | undefined>(undefined);
  let promptError = $state('');
  let errorMessage = $state('');
  let currentRecord = $state<TOTPRecord | undefined>(undefined);

  // Get the encrypted data from the URL parameter
  const dataParam = $derived($page.params.data);
  // Get optional record ID from search params (for saved TOTPs)
  const recordId = $derived($page.url.searchParams.get('id'));

  async function loadEncryptedData() {
    mode = 'loading';

    try {
      // Load record if we have an ID
      if (recordId) {
        const id = parseInt(recordId, 10);
        if (!isNaN(id)) {
          const record = await totpStorage.getById(id);
          if (record) {
            currentRecord = record;
            encryptedData = record.encrypted;
          }
        }
      }

      // If no record, decode from URL parameter
      if (!encryptedData && dataParam) {
        encryptedData = decodeFromURL(decodeURIComponent(dataParam));
      }

      if (!encryptedData) {
        errorMessage = 'No encrypted data found.';
        mode = 'error';
        return;
      }

      // Try decrypting with empty passphrase first
      const result = await tryDecryptWithEmptyPassphrase(encryptedData);
      if (result) {
        config = result;
        mode = 'display';
        if (currentRecord) {
          await totpStorage.updateLastUsed(currentRecord.id);
        }
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

  function handleBackToList() {
    void goto('#/');
  }

  // Load encrypted data on initial render and when route params change
  $effect(() => {
    if (dataParam) {
      void loadEncryptedData();
    }
  });
</script>

{#if mode === 'loading'}
  <div class="text-center p-8">
    <p class="text-muted-foreground">Loading...</p>
  </div>
{:else if mode === 'prompt'}
  <PassphrasePrompt
    onUnlock={handleUnlock}
    onBack={handleBackToList}
    error={promptError}
    label={currentRecord?.label}
    hint={currentRecord?.passphraseHint}
  />
{:else if mode === 'display' && config}
  <TotpDisplay
    {config}
    onBackToList={handleBackToList}
    record={currentRecord}
    encryptedData={currentRecord ? undefined : encryptedData}
  />
{:else if mode === 'error'}
  <div class="text-center p-8">
    <p class="text-destructive mb-4">{errorMessage}</p>
    <Button onclick={handleBackToList}>Go Back</Button>
  </div>
{/if}
