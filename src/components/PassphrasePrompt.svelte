<script lang="ts">
  interface Props {
    onUnlock: (passphrase: string) => void;
    error?: string;
  }

  let { onUnlock, error = '' }: Props = $props();

  let passphrase = $state('');

  function handleSubmit() {
    onUnlock(passphrase);
  }
</script>

<div class="prompt">
  <h2>Enter Passphrase</h2>
  <p>This TOTP is protected with a passphrase.</p>

  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="form-group">
      <input
        type="password"
        bind:value={passphrase}
        placeholder="Enter your passphrase"
        autocomplete="off"
      />
    </div>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <button type="submit" class="btn-primary">
      Unlock
    </button>
  </form>
</div>

<style>
  .prompt {
    width: 100%;
    max-width: 400px;
    text-align: center;
  }

  h2 {
    margin-bottom: 0.5rem;
    color: #333;
  }

  p {
    color: #666;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  input {
    width: 100%;
    padding: 0.875rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
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
</style>
