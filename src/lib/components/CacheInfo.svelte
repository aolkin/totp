<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import {
    getCacheInfo,
    isAppCached,
    isPersistentStorageGranted,
    refreshCache,
    formatBytes,
    formatRelativeTime,
    type CacheInfo as CacheInfoType,
  } from '$lib/offline';

  let cacheInfo = $state<CacheInfoType>({ totalSize: 0, lastUpdate: undefined, itemCount: 0 });
  let isCached = $state(false);
  let isPersisted = $state(false);
  let loading = $state(true);
  let refreshing = $state(false);

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
            <span class="text-primary">✓</span>
            <span class="text-sm">Ready to work offline</span>
          {:else}
            <span class="text-muted-foreground">⚠</span>
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
                <span class="text-primary">Protected from cleanup ✓</span>
              {:else}
                <span class="text-muted-foreground">May be cleared by browser</span>
              {/if}
            </div>
            <div>Build: <code class="text-xs">{__COMMIT_HASH__.substring(0, 7)}</code></div>
          </div>

          <div class="pt-2">
            <Button onclick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
              {refreshing ? 'Checking...' : 'Check for Updates'}
            </Button>
          </div>
        {/if}
      </div>
    {/if}
  </CardContent>
</Card>
