<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { generateTOTPCode, getTimeRemaining } from '../lib/totp';
  import type { TOTPConfig } from '../lib/types';

  interface Props {
    config: TOTPConfig;
    onCreateNew: () => void;
  }

  let { config, onCreateNew }: Props = $props();

  let code = $state('');
  let timeRemaining = $state(0);
  let intervalId: number | undefined;

  function updateCode() {
    code = generateTOTPCode(config);
    timeRemaining = getTimeRemaining(config.period);
  }

  function tick() {
    const newTimeRemaining = getTimeRemaining(config.period);
    if (newTimeRemaining > timeRemaining) {
      code = generateTOTPCode(config);
    }
    timeRemaining = newTimeRemaining;
  }

  onMount(() => {
    updateCode();
    intervalId = window.setInterval(tick, 1000);
  });

  onDestroy(() => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
    }
  });

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback handled by user
    }
  }

  function formatCode(code: string): string {
    if (code.length === 6) {
      return `${code.slice(0, 3)} ${code.slice(3)}`;
    }
    if (code.length === 8) {
      return `${code.slice(0, 4)} ${code.slice(4)}`;
    }
    return code;
  }

  let progress = $derived((timeRemaining / config.period) * 100);
  let formattedCode = $derived(formatCode(code));
</script>

<div class="totp-display">
  {#if config.label}
    <div class="label">{config.label}</div>
  {/if}

  <div class="code" onclick={copyCode} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && copyCode()}>
    {formattedCode}
  </div>

  <div class="timer">
    <svg class="countdown-ring" viewBox="0 0 36 36">
      <path
        class="ring-bg"
        d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="#e0e0e0"
        stroke-width="3"
      />
      <path
        class="ring-progress"
        d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="#0066cc"
        stroke-width="3"
        stroke-dasharray="{progress}, 100"
      />
    </svg>
    <span class="seconds">{timeRemaining}s</span>
  </div>

  <button class="copy-btn" onclick={copyCode}>
    Copy Code
  </button>

  <button class="create-new-btn" onclick={onCreateNew}>
    Create New TOTP
  </button>
</div>

<style>
  .totp-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
  }

  .label {
    font-size: 1.25rem;
    color: #666;
    margin-bottom: 1rem;
    text-align: center;
  }

  .code {
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 3rem;
    font-weight: bold;
    letter-spacing: 0.1em;
    color: #333;
    padding: 1rem 1.5rem;
    background: #f5f5f5;
    border-radius: 8px;
    cursor: pointer;
    user-select: all;
    margin-bottom: 1.5rem;
  }

  .code:hover {
    background: #e8e8e8;
  }

  .timer {
    position: relative;
    width: 60px;
    height: 60px;
    margin-bottom: 1.5rem;
  }

  .countdown-ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    stroke: #e0e0e0;
  }

  .ring-progress {
    stroke: #0066cc;
    stroke-linecap: round;
    transition: stroke-dasharray 0.3s ease;
  }

  .seconds {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1rem;
    font-weight: 500;
    color: #333;
  }

  .copy-btn {
    width: 100%;
    padding: 0.875rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 0.5rem;
  }

  .copy-btn:hover {
    background: #0052a3;
  }

  .create-new-btn {
    width: 100%;
    padding: 0.75rem;
    background: none;
    color: #0066cc;
    border: none;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .create-new-btn:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .code {
      font-size: 2.5rem;
    }
  }
</style>
