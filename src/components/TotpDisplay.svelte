<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { generateTOTPCode, getTimeRemaining } from '../lib/totp';
  import type { TOTPConfig } from '../lib/types';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';

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

<Card class="w-full max-w-md">
  <CardContent class="flex flex-col items-center p-8 space-y-6">
    {#if config.label}
      <div class="text-xl text-muted-foreground text-center">{config.label}</div>
    {/if}

    <div
      class="font-mono text-5xl md:text-6xl font-bold tracking-widest bg-muted px-6 py-4 rounded-lg cursor-pointer select-all hover:bg-muted/80 transition-colors"
      onclick={copyCode}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && copyCode()}
    >
      {formattedCode}
    </div>

    <div class="relative w-16 h-16">
      <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="hsl(var(--muted))"
          stroke-width="3"
        />
        <path
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="hsl(var(--primary))"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray="{progress}, 100"
          class="transition-all duration-300"
        />
      </svg>
      <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-medium">
        {timeRemaining}s
      </span>
    </div>

    <div class="w-full space-y-2">
      <Button class="w-full" onclick={copyCode}>
        Copy Code
      </Button>

      <Button variant="ghost" class="w-full text-sm" onclick={onCreateNew}>
        Create New TOTP
      </Button>
    </div>
  </CardContent>
</Card>
