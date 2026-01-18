<script lang="ts">
  import { generatePassphrase, calculateStrength, getStrengthLabel } from '../lib/passphrase';
  import { encrypt, encodeToURL, isValidBase32, normalizeBase32 } from '../lib/crypto';
  import { DEFAULT_DIGITS, DEFAULT_PERIOD, DEFAULT_ALGORITHM, type TOTPConfig } from '../lib/types';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import { Progress } from '$lib/components/ui/progress';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import { totpStorage, isIndexedDBSupported } from '$lib/storage';
  import { toast } from 'svelte-sonner';

  interface Props {
    onSaved?: () => void;
    onBack?: () => void;
    showBackButton?: boolean;
  }

  const { onSaved, onBack, showBackButton = false }: Props = $props();

  let secret = $state('');
  let label = $state('');
  let passphrase = $state(generatePassphrase());
  let isCustomPassphrase = $state(false);
  let showAdvanced = $state(false);
  let digits = $state(DEFAULT_DIGITS);
  let period = $state(DEFAULT_PERIOD);
  let algorithm = $state<'SHA1' | 'SHA256' | 'SHA512'>(DEFAULT_ALGORITHM);
  let saveToBrowser = $state(false);
  let passphraseHint = $state('');

  let generatedURL = $state('');
  let savedPassphrase = $state('');
  let wasSavedToBrowser = $state(false);
  let error = $state('');
  let showResult = $state(false);

  const canSaveToBrowser = isIndexedDBSupported();

  function regeneratePassphrase() {
    passphrase = generatePassphrase();
    isCustomPassphrase = false;
  }

  function handlePassphraseInput() {
    isCustomPassphrase = true;
  }

  const strength = $derived(isCustomPassphrase ? calculateStrength(passphrase) : 4);
  const strengthLabel = $derived(getStrengthLabel(strength));

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

    if (saveToBrowser && !passphrase) {
      error = 'A passphrase is required when saving to browser.';
      return;
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
      generatedURL = `${window.location.origin}${window.location.pathname}#${fragment}`;
      savedPassphrase = passphrase;
      wasSavedToBrowser = false;

      if (saveToBrowser && canSaveToBrowser) {
        await totpStorage.add(label || 'Unnamed TOTP', encrypted, passphraseHint || undefined);
        wasSavedToBrowser = true;
        toast.success('TOTP saved to browser');
      }

      showResult = true;
    } catch {
      error = 'Failed to generate URL. Please try again.';
    }
  }

  function resetForm() {
    secret = '';
    label = '';
    passphrase = generatePassphrase();
    isCustomPassphrase = false;
    showAdvanced = false;
    digits = DEFAULT_DIGITS;
    period = DEFAULT_PERIOD;
    algorithm = DEFAULT_ALGORITHM;
    saveToBrowser = false;
    passphraseHint = '';
    generatedURL = '';
    savedPassphrase = '';
    wasSavedToBrowser = false;
    error = '';
    showResult = false;
  }

  function handleCreateAnother() {
    if (wasSavedToBrowser && onSaved) {
      onSaved();
    } else {
      resetForm();
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
        <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
          Anyone with this URL can access the TOTP code.
        </div>
      {/if}

      {#if wasSavedToBrowser}
        <div class="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
          ✓ Saved to browser storage
        </div>
      {/if}

      <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
        Save this URL{savedPassphrase ? ' and passphrase' : ''}. They cannot be recovered.
      </div>

      <div class="space-y-2">
        <Button type="button" onclick={handleCreateAnother} variant="secondary" class="w-full">
          {wasSavedToBrowser ? 'Back to List' : 'Create Another'}
        </Button>
        {#if showBackButton && onBack && !wasSavedToBrowser}
          <Button type="button" onclick={onBack} variant="ghost" class="w-full">
            Back to List
          </Button>
        {/if}
      </div>
    </CardContent>
  </Card>
{:else}
  <Card class="w-full max-w-md">
    <CardHeader>
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">Create TOTP URL</h2>
        {#if showBackButton && onBack}
          <Button variant="ghost" onclick={onBack}>← Back</Button>
        {/if}
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
          <Input
            type="text"
            id="secret"
            bind:value={secret}
            placeholder="AAAA BBBB CCCC DDDD"
            class="font-mono tracking-wider"
            autocomplete="off"
            spellcheck="false"
          />
          <p class="text-sm text-muted-foreground">Enter the secret key provided by the service</p>
        </div>

        <div class="space-y-2">
          <Label for="label">Label (optional)</Label>
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

        {#if canSaveToBrowser}
          <div class="space-y-4 p-4 border rounded-md">
            <div class="flex items-center space-x-2">
              <Checkbox id="save-to-browser" bind:checked={saveToBrowser} />
              <Label for="save-to-browser" class="text-sm font-medium cursor-pointer">
                Save to this browser
              </Label>
            </div>

            {#if saveToBrowser}
              <Alert>
                <AlertDescription>
                  A passphrase is required when saving to browser. The passphrase will not be stored
                  - you'll need to enter it each time you view this TOTP.
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
          </div>
        {/if}

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
