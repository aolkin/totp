<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';

  interface Props {
    onInstall?: () => void;
  }

  const { onInstall }: Props = $props();

  let visible = $state(false);

  onMount(() => {
    // Check if banner has been dismissed before
    const dismissed = localStorage.getItem('offline_banner_dismissed');

    if (!dismissed) {
      visible = true;

      // Auto-hide after 10 seconds
      const timeout = setTimeout(() => {
        handleDismiss();
      }, 10000);

      return () => {
        clearTimeout(timeout);
      };
    }
  });

  function handleDismiss() {
    visible = false;
    localStorage.setItem('offline_banner_dismissed', 'true');
  }

  function handleInstall() {
    handleDismiss();
    if (onInstall) {
      onInstall();
    }
  }
</script>

{#if visible}
  <div class="fixed top-0 left-0 right-0 z-50 p-4">
    <Card class="mx-auto max-w-2xl border-green-500 bg-green-50">
      <CardContent class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 text-2xl">✓</div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-green-900 mb-2">App Ready for Offline Use</h2>
            <p class="text-sm text-green-800 mb-4">
              This app now works without internet connection. Your TOTPs are always available, even
              offline.
            </p>
            <div class="flex gap-2 flex-wrap">
              <Button onclick={handleDismiss} variant="outline" size="sm">Got It</Button>
              {#if onInstall}
                <Button onclick={handleInstall} size="sm">Install for Best Experience</Button>
              {/if}
            </div>
          </div>
          <button
            onclick={handleDismiss}
            class="flex-shrink-0 text-green-700 hover:text-green-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
{/if}
