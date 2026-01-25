<script lang="ts">
  import { onMount } from 'svelte';
  import { generatePassphrase, calculateStrength, getStrengthLabel } from '$lib/passphrase';
  import { encrypt, encodeToURL, isValidBase32, normalizeBase32 } from '$lib/crypto';
  import {
    DEFAULT_DIGITS,
    DEFAULT_PERIOD,
    DEFAULT_ALGORITHM,
    type TOTPConfig,
    type Algorithm,
    type Account,
  } from '$lib/types';
  import type { OTPAuthData } from '$lib/otpauth';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import { Progress } from '$lib/components/ui/progress';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
  import { totpStorage } from '$lib/storage';
  import { savePassphraseToAccount } from '$lib/passphrase-storage';
  import {
    accountRepository,
    unlockedAccounts,
    createAccount,
    recordAccountActivity,
  } from '$lib/accounts';
  import { toast } from 'svelte-sonner';
  import QrScanner from '$lib/components/QrScanner.svelte';
  import UnlockAccountDialog from '$lib/components/UnlockAccountDialog.svelte';
  import CreateAccountDialog from '$lib/components/CreateAccountDialog.svelte';

  type SaveOption = 'none' | 'browser' | 'account';

  let secret = $state('');
  let label = $state('');
  let passphrase = $state(generatePassphrase());
  let isCustomPassphrase = $state(false);
  let showAdvanced = $state(false);
  let digits = $state(DEFAULT_DIGITS);
  let period = $state(DEFAULT_PERIOD);
  let saveOption = $state<SaveOption>('none');
  let selectedAccountId = $state<number | undefined>(undefined);
  let passphraseHint = $state('');
  let algorithm = $state<Algorithm>(DEFAULT_ALGORITHM);
  let showScanner = $state(false);

  let generatedURL = $state('');
  let savedPassphrase = $state('');
  let wasSavedToBrowser = $state(false);
  let error = $state('');
  let showResult = $state(false);

  let accounts = $state<Account[]>([]);
  let unlockedMap = $state(new Map());
  let accountToUnlock = $state<Account | undefined>(undefined);
  let unlockError = $state('');
  let showCreateAccountDialog = $state(false);

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

  function handleScan(data: OTPAuthData): void {
    secret = data.secret;
    label = data.label || data.issuer || '';
    digits = data.digits;
    period = data.period;
    algorithm = data.algorithm;
    if (
      data.digits !== DEFAULT_DIGITS ||
      data.period !== DEFAULT_PERIOD ||
      data.algorithm !== DEFAULT_ALGORITHM
    ) {
      showAdvanced = true;
    }
  }

  function regeneratePassphrase() {
    passphrase = generatePassphrase();
    isCustomPassphrase = false;
  }

  function handlePassphraseInput() {
    isCustomPassphrase = true;
  }

  const strength = $derived(isCustomPassphrase ? calculateStrength(passphrase) : 4);
  const strengthLabel = $derived(getStrengthLabel(strength));

  function isAccountUnlocked(accountId: number): boolean {
    return unlockedMap.has(accountId);
  }

  async function handleUnlockAccount(password: string) {
    if (!accountToUnlock) return;
    unlockError = '';
    try {
      const { unlockAccount } = await import('$lib/accounts');
      await unlockAccount(accountToUnlock.id, password);
      selectedAccountId = accountToUnlock.id;
      toast.success('Account unlocked');
      accountToUnlock = undefined;
    } catch (err) {
      unlockError = err instanceof Error ? err.message : 'Failed to unlock account';
      throw err;
    }
  }

  async function handleCreateAccountSubmit(username: string, password: string, autoLock: number) {
    const account = await createAccount(username, password, autoLock);
    toast.success('Account created');
    showCreateAccountDialog = false;
    await loadAccounts();
    selectedAccountId = account.id;
  }

  function handleAccountSelection(value: string | undefined) {
    if (!value) return;

    if (value === 'create-new') {
      showCreateAccountDialog = true;
      return;
    }

    const accountId = parseInt(value, 10);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) return;

    if (!isAccountUnlocked(accountId)) {
      accountToUnlock = account;
    } else {
      selectedAccountId = accountId;
    }
  }

  async function handleSubmit() {
    error = '';

    const normalizedSecret = normalizeBase32(secret);

    if (!normalizedSecret) {
      error = 'Please enter a TOTP secret.';
      return;
    }

    if (!isValidBase32(normalizedSecret)) {
      error = 'Invalid format. Please enter a valid Base32 secret (letters A-Z and digits 2-7).';
      return;
    }

    if (isCustomPassphrase && passphrase.length > 0 && passphrase.length < 12) {
      error = 'Custom passphrase must be at least 12 characters.';
      return;
    }

    if (saveOption !== 'none' && !passphrase) {
      error = 'A passphrase is required when saving.';
      return;
    }

    if (saveOption !== 'none' && !label.trim()) {
      error = 'A label is required when saving.';
      return;
    }

    if (saveOption === 'account') {
      if (!selectedAccountId) {
        error = 'Please select an account.';
        return;
      }
      if (!isAccountUnlocked(selectedAccountId)) {
        error = 'Selected account must be unlocked.';
        return;
      }
    }

    try {
      const config: TOTPConfig = {
        secret: normalizedSecret,
        label,
        digits,
        period,
        algorithm,
      };

      const encrypted = await encrypt(config, passphrase);
      const fragment = encodeToURL(encrypted);
      generatedURL = `${window.location.origin}/#/view/${encodeURIComponent(fragment)}`;
      savedPassphrase = passphrase;
      wasSavedToBrowser = false;

      if (saveOption === 'browser') {
        await totpStorage.addTotp(label || 'Unnamed TOTP', encrypted, passphraseHint || undefined);
        wasSavedToBrowser = true;
        toast.success('TOTP saved to browser');
      } else if (saveOption === 'account' && selectedAccountId) {
        const totpId = await totpStorage.addTotp(
          label || 'Unnamed TOTP',
          encrypted,
          passphraseHint || undefined,
          selectedAccountId,
        );
        await savePassphraseToAccount(selectedAccountId, totpId, passphrase);
        recordAccountActivity(selectedAccountId);
        wasSavedToBrowser = true;
        toast.success('TOTP and passphrase saved to account');
      }

      showResult = true;
    } catch {
      error = 'Failed to generate URL. Please try again.';
    }
  }

  async function copyURL() {
    try {
      await navigator.clipboard.writeText(generatedURL);
      toast.success('URL copied');
    } catch {
      toast.error('Failed to copy URL');
    }
  }
</script>

{#if showResult}
  <Card class="w-full max-w-md">
    <CardHeader>
      <h2 class="text-2xl font-semibold">URL Generated</h2>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label>Your TOTP URL:</Label>
        <div class="flex gap-2">
          <Input
            type="text"
            readonly
            value={generatedURL}
            class="text-sm font-mono"
            aria-label="Generated TOTP URL"
          />
          <Button type="button" onclick={copyURL}>Copy</Button>
        </div>
      </div>

      {#if savedPassphrase}
        <div class="space-y-2">
          <Label>Passphrase:</Label>
          <code class="block p-3 bg-muted rounded-md font-mono text-sm break-all"
            >{savedPassphrase}</code
          >
        </div>
      {:else}
        <div
          class="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm"
        >
          Anyone with this URL can access the TOTP code.
        </div>
      {/if}

      {#if wasSavedToBrowser}
        <div class="p-3 bg-primary/10 border border-primary/30 rounded-md text-primary text-sm">
          ✓ Saved to browser storage
        </div>
      {/if}

      {#if !wasSavedToBrowser}
        <div
          class="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm"
        >
          Save this URL{savedPassphrase ? ' and passphrase' : ''}. They cannot be recovered.
        </div>
      {/if}

      <div class="space-y-2">
        <a
          href="#/"
          class="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          View Saved TOTPs
        </a>
      </div>
    </CardContent>
  </Card>
{:else}
  <Card class="w-full max-w-md">
    <CardHeader>
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">Create TOTP URL</h2>
        <a href="#/" class="text-sm text-muted-foreground hover:text-foreground">← Back</a>
      </div>
    </CardHeader>
    <CardContent>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        class="space-y-4"
      >
        <div class="space-y-2">
          <Label for="secret">TOTP Secret *</Label>
          <div class="flex gap-2">
            <Input
              type="text"
              id="secret"
              bind:value={secret}
              placeholder="AAAA BBBB CCCC DDDD"
              class="font-mono tracking-wider flex-1"
              autocomplete="off"
              spellcheck="false"
            />
            <Button
              type="button"
              onclick={() => (showScanner = true)}
              variant="outline"
              data-testid="scan-qr-button"
            >
              Scan QR
            </Button>
          </div>
          <p class="text-sm text-muted-foreground">Enter the secret key or scan a QR code</p>
        </div>

        <div class="space-y-2">
          <Label for="label">Label {saveOption !== 'none' ? '*' : '(optional)'}</Label>
          <Input type="text" id="label" bind:value={label} placeholder="Service - account" />
          <p class="text-sm text-muted-foreground">A description to identify this TOTP</p>
        </div>

        <div class="space-y-2">
          <Label for="passphrase">Passphrase</Label>
          <div class="flex gap-2">
            <Input
              type="text"
              id="passphrase"
              bind:value={passphrase}
              oninput={handlePassphraseInput}
              class="flex-1 font-mono tracking-wider"
              autocomplete="off"
            />
            <Button type="button" onclick={regeneratePassphrase} variant="outline">
              Regenerate
            </Button>
          </div>
          {#if isCustomPassphrase}
            <Progress value={(strength + 1) * 20} class="h-1" />
            <p class="text-sm text-muted-foreground">Strength: {strengthLabel}</p>
          {:else}
            <p class="text-sm text-muted-foreground">Auto-generated passphrase (recommended)</p>
          {/if}
        </div>

        <div class="space-y-4 p-4 border rounded-md">
          <Label>Save Options</Label>
          <RadioGroup value={saveOption} onValueChange={(v) => (saveOption = v as SaveOption)}>
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="none" id="save-none" />
              <Label for="save-none" class="text-sm font-normal cursor-pointer">
                Don't save (URL only)
              </Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="browser" id="save-browser" />
              <Label for="save-browser" class="text-sm font-normal cursor-pointer">
                Save TOTP to browser (passphrase required each time)
              </Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="account" id="save-account" />
              <Label for="save-account" class="text-sm font-normal cursor-pointer">
                Save TOTP and passphrase to account
              </Label>
            </div>
          </RadioGroup>

          {#if saveOption === 'browser'}
            <Alert>
              <AlertDescription>
                A label and passphrase are required. The passphrase will not be stored - you'll need
                to enter it each time you view this TOTP.
              </AlertDescription>
            </Alert>

            <div class="space-y-2">
              <Label for="passphrase-hint">Passphrase Hint (optional)</Label>
              <Input
                type="text"
                id="passphrase-hint"
                bind:value={passphraseHint}
                placeholder="e.g., office door code"
              />
              <p class="text-sm text-muted-foreground">
                This hint will be shown when viewing the TOTP to help you remember the passphrase.
              </p>
            </div>
          {/if}

          {#if saveOption === 'account'}
            <div class="space-y-2">
              <Label for="account-select">Select Account</Label>
              <Select
                type="single"
                value={selectedAccountId ? String(selectedAccountId) : undefined}
                onValueChange={handleAccountSelection}
              >
                <SelectTrigger id="account-select">
                  <span class="truncate">
                    {#if selectedAccountId}
                      {accounts.find((a) => a.id === selectedAccountId)?.username ??
                        'Select account'}
                      {isAccountUnlocked(selectedAccountId) ? '(unlocked)' : '(locked)'}
                    {:else}
                      Select account
                    {/if}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {#each accounts as account (account.id)}
                    <SelectItem value={String(account.id)}>
                      {account.username}
                      {isAccountUnlocked(account.id) ? '(unlocked)' : '(locked - click to unlock)'}
                    </SelectItem>
                  {/each}
                  <SelectItem value="create-new">+ Create new account...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertDescription>
                The TOTP and passphrase will be encrypted with your account's encryption key. You
                won't need to enter the passphrase when viewing if your account is unlocked.
              </AlertDescription>
            </Alert>

            <div class="space-y-2">
              <Label for="passphrase-hint-account">Passphrase Hint (optional)</Label>
              <Input
                type="text"
                id="passphrase-hint-account"
                bind:value={passphraseHint}
                placeholder="e.g., office door code"
              />
              <p class="text-sm text-muted-foreground">
                This hint will be shown if you need to manually enter the passphrase.
              </p>
            </div>
          {/if}
        </div>

        <Button
          type="button"
          variant="ghost"
          class="w-full text-sm"
          onclick={() => (showAdvanced = !showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </Button>

        {#if showAdvanced}
          <div class="p-4 bg-muted rounded-md space-y-4">
            <div class="space-y-2">
              <Label for="digits">Digits</Label>
              <select
                id="digits"
                bind:value={digits}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={6}>6</option>
                <option value={7}>7</option>
                <option value={8}>8</option>
              </select>
            </div>

            <div class="space-y-2">
              <Label for="period">Period (seconds)</Label>
              <Input type="number" id="period" bind:value={period} min="15" max="120" />
            </div>

            <div class="space-y-2">
              <Label for="algorithm">Algorithm</Label>
              <select
                id="algorithm"
                bind:value={algorithm}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="SHA1">SHA1</option>
                <option value="SHA256">SHA256</option>
                <option value="SHA512">SHA512</option>
              </select>
            </div>
          </div>
        {/if}

        {#if error}
          <div
            class="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm"
          >
            {error}
          </div>
        {/if}

        <Button type="submit" class="w-full">Generate TOTP URL</Button>
      </form>
    </CardContent>
  </Card>
{/if}

<QrScanner bind:open={showScanner} onScan={handleScan} onClose={() => (showScanner = false)} />

<UnlockAccountDialog
  open={accountToUnlock !== undefined}
  account={accountToUnlock}
  error={unlockError}
  onUnlock={handleUnlockAccount}
  onCancel={() => {
    accountToUnlock = undefined;
    unlockError = '';
  }}
/>

<CreateAccountDialog
  open={showCreateAccountDialog}
  onCreate={handleCreateAccountSubmit}
  onCancel={() => {
    showCreateAccountDialog = false;
  }}
/>
