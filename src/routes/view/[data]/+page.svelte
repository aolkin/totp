<script lang="ts">
  import { page } from '$app/stores';
  import TotpDisplay from '$lib/components/TotpDisplay.svelte';
  import PassphrasePrompt from '$lib/components/PassphrasePrompt.svelte';
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

  async function loadEncryptedData() {
    mode = 'loading';

    try {
      // Decode from URL parameter first
      if (dataParam) {
        const decoded = decodeURIComponent(dataParam);
        encryptedData = decodeFromURL(decoded);

        // Try to find matching saved record by encoded data
        const record = await totpStorage.findByEncodedData(decoded);
        if (record) {
          currentRecord = record;
        }
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
    error={promptError}
    label={currentRecord?.label}
    hint={currentRecord?.passphraseHint}
  />
{:else if mode === 'display' && config}
  <TotpDisplay
    {config}
    record={currentRecord}
    encryptedData={currentRecord ? undefined : encryptedData}
  />
{:else if mode === 'error'}
  <div class="text-center p-8">
    <p class="text-destructive mb-4">{errorMessage}</p>
    <a href="#/" class="text-primary hover:underline">Go Back</a>
  </div>
{/if}
