<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import {
    getCacheInfo,
    isAppCached,
    isPersistentStorageGranted,
    refreshCache,
    clearCache,
    formatBytes,
    formatRelativeTime,
    type CacheInfo as CacheInfoType,
  } from '$lib/offline';

  let cacheInfo = $state<CacheInfoType>({ totalSize: 0, lastUpdate: undefined, itemCount: 0 });
  let isCached = $state(false);
  let isPersisted = $state(false);
  let loading = $state(true);
  let refreshing = $state(false);
  let clearing = $state(false);

  onMount(() => {
    void loadCacheInfo();
  });

  async function loadCacheInfo() {
    loading = true;
    try {
      [cacheInfo, isCached, isPersisted] = await Promise.all([
        getCacheInfo(),
        isAppCached(),
        isPersistentStorageGranted(),
      ]);
    } finally {
      loading = false;
    }
  }

  async function handleRefresh() {
    refreshing = true;
    try {
      await refreshCache();
      await loadCacheInfo();
    } catch (error) {
      console.error('Error refreshing cache:', error);
    } finally {
      refreshing = false;
    }
  }

  async function handleClear() {
    if (
      !confirm(
        'This will reset the app to a fresh state and reload the page. Your TOTP codes in the URL will not be affected. Continue?',
      )
    ) {
      return;
    }

    clearing = true;
    try {
      await clearCache();
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      clearing = false;
    }
  }
</script>

<Card>
  <CardHeader>
    <h2 class="text-lg font-semibold">App Availability</h2>
  </CardHeader>
  <CardContent>
    {#if loading}
      <p class="text-sm text-muted-foreground">Checking app status...</p>
    {:else}
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          {#if isCached}
            <span class="text-green-600">✓</span>
            <span class="text-sm">Ready to work offline</span>
          {:else}
            <span class="text-yellow-600">⚠</span>
            <span class="text-sm">Downloading for offline use...</span>
          {/if}
        </div>

        {#if isCached}
          <div class="space-y-2 text-sm text-muted-foreground">
            <div>Last updated: {formatRelativeTime(cacheInfo.lastUpdate)}</div>
            <div>Storage used: {formatBytes(cacheInfo.totalSize)}</div>
            <div>Files saved: {cacheInfo.itemCount}</div>
            <div class="flex items-center gap-2">
              <span>Storage:</span>
              {#if isPersisted}
                <span class="text-green-600">Protected from cleanup ✓</span>
              {:else}
                <span class="text-yellow-600">May be cleared by browser</span>
              {/if}
            </div>
            <div>Build: <code class="text-xs">{__COMMIT_HASH__.substring(0, 7)}</code></div>
          </div>

          <div class="flex gap-2 pt-2">
            <Button onclick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
              {refreshing ? 'Checking...' : 'Check for Updates'}
            </Button>
            <Button
              onclick={handleClear}
              variant="outline"
              size="sm"
              disabled={clearing}
              class="text-destructive hover:text-destructive"
            >
              {clearing ? 'Resetting...' : 'Reset App'}
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </CardContent>
</Card>
