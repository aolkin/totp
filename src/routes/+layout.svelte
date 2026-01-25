<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import OfflineBanner from '$lib/components/OfflineBanner.svelte';
  import UpdateBanner from '$lib/components/UpdateBanner.svelte';
  import CacheInfo from '$lib/components/CacheInfo.svelte';
  import { requestPersistentStorage } from '$lib/offline';
  import { toast } from 'svelte-sonner';
  import {
    recordAccountActivity,
    startAutoLockMonitor,
    stopAutoLockMonitor,
    lockAllAccounts,
  } from '$lib/accounts';
  import AccountManager from '$lib/components/AccountManager.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';

  interface Props {
    children: import('svelte').Snippet;
  }

  const { children }: Props = $props();

  let showSettings = $state(false);

  function handleUpdate() {
    window.location.reload();
  }

  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(async (registration) => {
          // Request persistent storage when service worker is ready
          if (registration.active) {
            await requestPersistentStorage();
          } else {
            // Wait for the service worker to become active
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'activated') {
                    void requestPersistentStorage();
                  }
                });
              }
            });
          }
        })
        .catch((error: unknown) => {
          console.error('Service worker registration failed:', error);
        });
    }
    startAutoLockMonitor((account) => {
      toast.warning(`Account "${account.username}" locked due to inactivity`);
    });
    const handleActivity = () => {
      recordAccountActivity();
    };
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      stopAutoLockMonitor();
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  });
</script>

<Toaster />
<OfflineBanner />
<UpdateBanner onUpdate={handleUpdate} />

<main class="flex min-h-screen flex-col items-center p-4 font-sans">
  <header class="mb-8 text-center relative w-full max-w-2xl">
    <h1 class="text-2xl font-semibold">TOTP Authenticator</h1>
    <button
      onclick={() => (showSettings = !showSettings)}
      class="absolute right-0 top-0 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
      aria-label="Settings"
    >
      ⚙️
    </button>
  </header>

  {#if showSettings}
    <div class="w-full max-w-2xl mb-8">
      <div class="space-y-6">
        <CacheInfo />
        <Separator />
        <div class="rounded-md border bg-card p-4 space-y-2">
          <div class="font-semibold">Accounts</div>
          <div class="text-sm text-muted-foreground">Manage accounts and auto-lock settings.</div>
          <AccountManager>
            {#snippet trigger(props)}
              <Button {...props} variant="outline" size="sm">Manage Accounts</Button>
            {/snippet}
          </AccountManager>
          <Button variant="outline" size="sm" onclick={lockAllAccounts}>
            Lock All Accounts Now
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <div class="flex w-full justify-center p-4">
    {@render children()}
  </div>
</main>
