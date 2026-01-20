<script lang="ts">
  import CreateForm from '$lib/components/CreateForm.svelte';
  import { goto } from '$app/navigation';

  function handleSaved() {
    void goto('/');
  }

  function handleBack() {
    void goto('/');
  }
</script>

<CreateForm onSaved={handleSaved} onBack={handleBack} showBackButton={true} />
