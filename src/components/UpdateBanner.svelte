<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';

  interface Props {
    onUpdate?: () => void;
  }

  const { onUpdate }: Props = $props();

  let visible = $state(false);

  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const dismissed = sessionStorage.getItem('update_banner_dismissed');
        if (!dismissed) {
          visible = true;
        }
      });
    }
  });

  function handleDismiss() {
    visible = false;
    sessionStorage.setItem('update_banner_dismissed', 'true');
  }

  function handleUpdate() {
    if (onUpdate) {
      onUpdate();
    }
  }
</script>

{#if visible}
  <div class="fixed top-0 left-0 right-0 z-50 p-4">
    <Card class="mx-auto max-w-2xl border-primary bg-card">
      <CardContent class="p-6">
        <div class="flex items-start gap-4">
          <div class="shrink-0 text-2xl">🔄</div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-card-foreground mb-2">Update Available</h2>
            <p class="text-sm text-muted-foreground mb-4">
              A new version with improvements is available.
            </p>
            <div class="flex gap-2 flex-wrap">
              <Button onclick={handleUpdate} size="sm">Update Now</Button>
              <Button onclick={handleDismiss} variant="outline" size="sm">Later</Button>
            </div>
          </div>
          <button
            onclick={handleDismiss}
            class="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
{/if}
