<script lang="ts">
  import TotpList from '$lib/components/TotpList.svelte';
  import type { TOTPRecord } from '$lib/types';
  import { encodeToURL } from '$lib/crypto';

  // Note: Using window.location.hash instead of SvelteKit's goto() because
  // goto() doesn't properly convert paths to hash URLs in hash routing mode.
  // This is a workaround for proper hash-based navigation.
  function handleViewRecord(record: TOTPRecord) {
    const encoded = encodeToURL(record.encrypted);
    window.location.hash = `/view/${encodeURIComponent(encoded)}?id=${String(record.id)}`;
  }

  function handleAddNew() {
    window.location.hash = '/create';
  }
</script>

<TotpList onView={handleViewRecord} onAdd={handleAddNew} />
