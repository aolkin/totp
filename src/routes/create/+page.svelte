<script lang="ts">
  import { goto } from '$app/navigation';
  import CreateForm from '$lib/components/CreateForm.svelte';

  function handleSaved() {
    void goto('#/');
  }

  function handleBack() {
    void goto('#/');
  }
</script>

<CreateForm onSaved={handleSaved} onBack={handleBack} showBackButton={true} />
