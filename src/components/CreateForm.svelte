<script lang="ts">
  import { generatePassphrase, calculateStrength, getStrengthLabel, getStrengthColor } from '../lib/passphrase';
  import { encrypt, encodeToURL, isValidBase32, normalizeBase32 } from '../lib/crypto';
  import { DEFAULT_DIGITS, DEFAULT_PERIOD, DEFAULT_ALGORITHM, type TOTPConfig } from '../lib/types';

  let secret = '';
  let label = '';
  let passphrase = generatePassphrase();
  let isCustomPassphrase = false;
  let showAdvanced = false;
  let digits = DEFAULT_DIGITS;
  let period = DEFAULT_PERIOD;
  let algorithm: 'SHA1' | 'SHA256' | 'SHA512' = DEFAULT_ALGORITHM;
  
  let generatedURL = '';
  let savedPassphrase = '';
  let error = '';
  let showResult = false;

  function regeneratePassphrase() {
    passphrase = generatePassphrase();
    isCustomPassphrase = false;
  }

  function handlePassphraseInput() {
    isCustomPassphrase = true;
  }

  $: strength = isCustomPassphrase ? calculateStrength(passphrase) : 4;
  $: strengthLabel = getStrengthLabel(strength);
  $: strengthColor = getStrengthColor(strength);

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
      showResult = true;
    } catch (e) {
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
    generatedURL = '';
    savedPassphrase = '';
    error = '';
    showResult = false;
  }

  async function copyURL() {
    try {
      await navigator.clipboard.writeText(generatedURL);
    } catch {
      // Fallback handled by user selecting text
    }
  }
</script>

{#if showResult}
  <div class="result">
    <h2>URL Generated</h2>
    
    <div class="result-section">
      <span class="label-text">Your TOTP URL:</span>
      <div class="url-box">
        <input type="text" readonly value={generatedURL} class="url-input" aria-label="Generated TOTP URL" />
        <button type="button" onclick={copyURL} class="copy-btn">Copy</button>
      </div>
    </div>

    {#if savedPassphrase}
      <div class="result-section">
        <span class="label-text">Passphrase:</span>
        <code class="passphrase-display">{savedPassphrase}</code>
      </div>
    {:else}
      <div class="warning">
        Anyone with this URL can access the TOTP code.
      </div>
    {/if}

    <div class="warning">
      Save this URL{savedPassphrase ? ' and passphrase' : ''}. They cannot be recovered.
    </div>

    <button type="button" onclick={resetForm} class="btn-secondary">
      Create Another
    </button>
  </div>
{:else}
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <h2>Create TOTP URL</h2>

    <div class="form-group">
      <label for="secret">TOTP Secret *</label>
      <input
        type="text"
        id="secret"
        bind:value={secret}
        placeholder="AAAA BBBB CCCC DDDD"
        class="monospace"
        autocomplete="off"
        spellcheck="false"
      />
      <small>Enter the secret key provided by the service</small>
    </div>

    <div class="form-group">
      <label for="label">Label (optional)</label>
      <input
        type="text"
        id="label"
        bind:value={label}
        placeholder="Service - account"
      />
      <small>A description to identify this TOTP</small>
    </div>

    <div class="form-group">
      <label for="passphrase">Passphrase</label>
      <div class="passphrase-input-group">
        <input
          type="text"
          id="passphrase"
          bind:value={passphrase}
          oninput={handlePassphraseInput}
          class="monospace"
          autocomplete="off"
        />
        <button type="button" onclick={regeneratePassphrase} class="btn-small">
          Regenerate
        </button>
      </div>
      {#if isCustomPassphrase}
        <div class="strength-meter">
          <div 
            class="strength-bar" 
            style="width: {(strength + 1) * 20}%; background-color: {strengthColor}"
          ></div>
        </div>
        <small>Strength: {strengthLabel}</small>
      {:else}
        <small>Auto-generated passphrase (recommended)</small>
      {/if}
    </div>

    <button 
      type="button" 
      class="toggle-advanced"
      onclick={() => showAdvanced = !showAdvanced}
    >
      {showAdvanced ? 'Hide' : 'Show'} Advanced Options
    </button>

    {#if showAdvanced}
      <div class="advanced-options">
        <div class="form-group">
          <label for="digits">Digits</label>
          <select id="digits" bind:value={digits}>
            <option value={6}>6</option>
            <option value={7}>7</option>
            <option value={8}>8</option>
          </select>
        </div>

        <div class="form-group">
          <label for="period">Period (seconds)</label>
          <input
            type="number"
            id="period"
            bind:value={period}
            min="15"
            max="120"
          />
        </div>

        <div class="form-group">
          <label for="algorithm">Algorithm</label>
          <select id="algorithm" bind:value={algorithm}>
            <option value="SHA1">SHA1</option>
            <option value="SHA256">SHA256</option>
            <option value="SHA512">SHA512</option>
          </select>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <button type="submit" class="btn-primary">
      Generate TOTP URL
    </button>
  </form>
{/if}

<style>
  form, .result {
    width: 100%;
    max-width: 400px;
  }

  h2 {
    margin-bottom: 1.5rem;
    color: #333;
    font-size: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label, .label-text {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
    color: #333;
  }

  input[type="text"],
  input[type="number"],
  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
  }

  .monospace {
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    letter-spacing: 0.05em;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #666;
    font-size: 0.875rem;
  }

  .passphrase-input-group {
    display: flex;
    gap: 0.5rem;
  }

  .passphrase-input-group input {
    flex: 1;
  }

  .btn-small {
    padding: 0.75rem 1rem;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-small:hover {
    background: #e0e0e0;
  }

  .strength-meter {
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    margin-top: 0.5rem;
    overflow: hidden;
  }

  .strength-bar {
    height: 100%;
    transition: width 0.3s, background-color 0.3s;
  }

  .toggle-advanced {
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    color: #0066cc;
    cursor: pointer;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .toggle-advanced:hover {
    text-decoration: underline;
  }

  .advanced-options {
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .error {
    padding: 0.75rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    color: #c00;
    margin-bottom: 1rem;
  }

  .btn-primary {
    width: 100%;
    padding: 0.875rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-primary:hover {
    background: #0052a3;
  }

  .btn-secondary {
    width: 100%;
    padding: 0.875rem;
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 1rem;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }

  .result-section {
    margin-bottom: 1.5rem;
  }

  .url-box {
    display: flex;
    gap: 0.5rem;
  }

  .url-input {
    flex: 1;
    font-size: 0.875rem;
  }

  .copy-btn {
    padding: 0.75rem 1rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .copy-btn:hover {
    background: #0052a3;
  }

  .passphrase-display {
    display: block;
    padding: 0.75rem;
    background: #f0f0f0;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    word-break: break-all;
  }

  .warning {
    padding: 0.75rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #856404;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
</style>
