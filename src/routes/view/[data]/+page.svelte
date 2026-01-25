<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import TotpDisplay from '$lib/components/TotpDisplay.svelte';
  import PassphrasePrompt from '$lib/components/PassphrasePrompt.svelte';
  import UnlockAccountDialog from '$lib/components/UnlockAccountDialog.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import {
    decodeFromURL,
    decrypt,
    tryDecryptWithEmptyPassphrase,
    type EncryptedData,
  } from '$lib/crypto';
  import type { TOTPConfig, TOTPRecord, Account } from '$lib/types';
  import { totpStorage } from '$lib/storage';
  import { getPassphraseFromAccount, savePassphraseToAccount } from '$lib/passphrase-storage';
  import { accountRepository, unlockedAccounts, recordAccountActivity } from '$lib/accounts';
  import { toast } from 'svelte-sonner';

  type ViewMode = 'loading' | 'prompt' | 'display' | 'error';

  let mode = $state<ViewMode>('loading');
  let config = $state<TOTPConfig | undefined>(undefined);
  let encryptedData = $state<EncryptedData | undefined>(undefined);
  let promptError = $state('');
  let errorMessage = $state('');
  let currentRecord = $state<TOTPRecord | undefined>(undefined);
  let currentPassphrase = $state<string | undefined>(undefined);

  let accounts = $state<Account[]>([]);
  let unlockedMap = $state(new Map());
  let accountToUnlock = $state<Account | undefined>(undefined);
  let unlockError = $state('');

  let showSaveToAccountDialog = $state(false);
  let selectedAccountForSave = $state<number | undefined>(undefined);

  const dataParam = $derived($page.params.data);

  onMount(() => {
    void loadAccounts();
    const unsub = unlockedAccounts.subscribe((map) => {
      unlockedMap = map;
    });
    return unsub;
  });

  async function loadAccounts() {
    try {
      accounts = await accountRepository.getAll();
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }

  function isAccountUnlocked(accountId: number): boolean {
    return unlockedMap.has(accountId);
  }

  async function loadEncryptedData() {
    mode = 'loading';

    try {
      if (dataParam) {
        const decoded = decodeURIComponent(dataParam);
        encryptedData = decodeFromURL(decoded);

        const record = await totpStorage.findByEncodedData(decoded);
        if (record) {
          currentRecord = record;

          if (record.savedWithAccount) {
            const passphrase = await getPassphraseFromAccount(record.savedWithAccount, record.id);

            if (passphrase) {
              config = await decrypt(encryptedData, passphrase);
              currentPassphrase = passphrase;
              mode = 'display';
              await totpStorage.updateLastUsed(record.id);
              recordAccountActivity(record.savedWithAccount);
              return;
            } else {
              const account = await accountRepository.getById(record.savedWithAccount);
              if (account && !isAccountUnlocked(record.savedWithAccount)) {
                accountToUnlock = account;
                return;
              }
            }
          }
        }
      }

      if (!encryptedData) {
        errorMessage = 'No encrypted data found.';
        mode = 'error';
        return;
      }

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

  async function handleUnlockForView(password: string) {
    if (!accountToUnlock || !currentRecord || !encryptedData) return;
    unlockError = '';
    try {
      const { unlockAccount } = await import('$lib/accounts');
      await unlockAccount(accountToUnlock.id, password);

      const passphrase = await getPassphraseFromAccount(accountToUnlock.id, currentRecord.id);
      if (passphrase) {
        config = await decrypt(encryptedData, passphrase);
        currentPassphrase = passphrase;
        mode = 'display';
        await totpStorage.updateLastUsed(currentRecord.id);
        recordAccountActivity(accountToUnlock.id);
      } else {
        mode = 'prompt';
      }

      accountToUnlock = undefined;
    } catch (err) {
      unlockError = err instanceof Error ? err.message : 'Failed to unlock account';
      throw err;
    }
  }

  async function handleUnlock(passphrase: string) {
    if (!encryptedData) return;

    try {
      config = await decrypt(encryptedData, passphrase);
      currentPassphrase = passphrase;
      mode = 'display';
      promptError = '';

      if (currentRecord) {
        await totpStorage.updateLastUsed(currentRecord.id);
      }
    } catch {
      promptError = 'Incorrect passphrase';
    }
  }

  async function handleSaveToAccount() {
    if (!currentRecord || !currentPassphrase || !selectedAccountForSave) return;

    try {
      if (!isAccountUnlocked(selectedAccountForSave)) {
        toast.error('Account must be unlocked');
        return;
      }

      await savePassphraseToAccount(selectedAccountForSave, currentRecord.id, currentPassphrase);
      await totpStorage.update(currentRecord.id, {
        savedWithAccount: selectedAccountForSave,
      });
      recordAccountActivity(selectedAccountForSave);

      toast.success('Passphrase saved to account');
      showSaveToAccountDialog = false;
      selectedAccountForSave = undefined;

      const updated = await totpStorage.getById(currentRecord.id);
      if (updated) {
        currentRecord = updated;
      }
    } catch (err) {
      toast.error('Failed to save passphrase to account');
      console.error(err);
    }
  }

  function handleAccountSelectionForSave(value: string | undefined) {
    if (!value) return;
    const accountId = parseInt(value, 10);
    selectedAccountForSave = accountId;
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
    onSaveToAccount={() => (showSaveToAccountDialog = true)}
  />
{:else if mode === 'error'}
  <div class="text-center p-8">
    <p class="text-destructive mb-4">{errorMessage}</p>
    <Button href="#/" variant="link">Go Back</Button>
  </div>
{/if}

<UnlockAccountDialog
  open={accountToUnlock !== undefined}
  account={accountToUnlock}
  error={unlockError}
  onUnlock={handleUnlockForView}
  onCancel={() => {
    accountToUnlock = undefined;
    unlockError = '';
    mode = 'prompt';
  }}
/>

<Dialog
  open={showSaveToAccountDialog}
  onOpenChange={(isOpen) => {
    if (!isOpen) {
      showSaveToAccountDialog = false;
      selectedAccountForSave = undefined;
    }
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Save Passphrase to Account</DialogTitle>
      <DialogDescription>
        Save this passphrase to an account for automatic decryption when the account is unlocked.
      </DialogDescription>
    </DialogHeader>
    <div class="space-y-3">
      <label for="account-select-save" class="text-sm font-medium">Select Account</label>
      <Select
        type="single"
        value={selectedAccountForSave ? String(selectedAccountForSave) : undefined}
        onValueChange={handleAccountSelectionForSave}
      >
        <SelectTrigger id="account-select-save">
          <span class="truncate">
            {#if selectedAccountForSave}
              {accounts.find((a) => a.id === selectedAccountForSave)?.username ?? 'Select account'}
              {isAccountUnlocked(selectedAccountForSave) ? '(unlocked)' : '(locked)'}
            {:else}
              Select account
            {/if}
          </span>
        </SelectTrigger>
        <SelectContent>
          {#each accounts.filter((a) => isAccountUnlocked(a.id)) as account (account.id)}
            <SelectItem value={String(account.id)}>
              {account.username} (unlocked)
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
      <p class="text-sm text-muted-foreground">
        Only unlocked accounts are shown. Unlock an account first to save the passphrase.
      </p>
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          showSaveToAccountDialog = false;
          selectedAccountForSave = undefined;
        }}>Cancel</Button
      >
      <Button onclick={handleSaveToAccount} disabled={!selectedAccountForSave}>
        Save to Account
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
