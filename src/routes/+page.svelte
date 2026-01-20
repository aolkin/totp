<script lang="ts">
  import TotpList from '$lib/components/TotpList.svelte';
  import type { TOTPRecord } from '$lib/types';
  import { goto } from '$app/navigation';
  import { encodeToURL } from '$lib/crypto';

  function handleViewRecord(record: TOTPRecord) {
    const encoded = encodeToURL(record.encrypted);
    void goto(`/view/${encodeURIComponent(encoded)}?id=${String(record.id)}`);
  }

  function handleAddNew() {
    void goto('/create');
  }
</script>

<TotpList onView={handleViewRecord} onAdd={handleAddNew} />
