<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';
  import InstallInstructions from './InstallInstructions.svelte';

  let visible = $state(false);
  let autoHideTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  let deferredPrompt = $state<Event | undefined>(undefined);
  let showInstructions = $state(false);

  onMount(() => {
    const dismissed = localStorage.getItem('offline_banner_dismissed');
    if (!dismissed) {
      visible = true;

      autoHideTimeout = setTimeout(() => {
        handleDismiss();
      }, 10000);
    }

    const beforeInstallHandler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', beforeInstallHandler);

    return () => {
      if (autoHideTimeout) {
        clearTimeout(autoHideTimeout);
      }
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
    };
  });

  function handleDismiss() {
    visible = false;
    localStorage.setItem('offline_banner_dismissed', 'true');
  }

  async function handleInstall() {
    if (deferredPrompt) {
      handleDismiss();
      const prompt = deferredPrompt as BeforeInstallPromptEvent;
      await prompt.prompt();
      await prompt.userChoice;
      deferredPrompt = undefined;
    } else {
      showInstructions = true;
    }
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
</script>

{#if visible}
  <div class="fixed top-0 left-0 right-0 z-50 p-4">
    <Card class="mx-auto max-w-2xl border-blue-500 bg-blue-50">
      <CardContent class="p-6">
        <div class="flex items-start gap-4">
          <div class="shrink-0 text-2xl">📱</div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-blue-900 mb-2">Install for Best Experience</h2>
            <p class="text-sm text-blue-800 mb-4">
              Add this app to your home screen for quick access and offline use.
            </p>
            <div class="flex gap-2 flex-wrap">
              <Button onclick={handleInstall} size="sm">Install Now</Button>
              <Button onclick={handleDismiss} variant="outline" size="sm">Maybe Later</Button>
            </div>
          </div>
          <button
            onclick={handleDismiss}
            class="shrink-0 text-blue-700 hover:text-blue-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
{/if}

<InstallInstructions bind:visible={showInstructions} />
