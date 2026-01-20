<script lang="ts">
  import CreateForm from '$lib/components/CreateForm.svelte';

  function handleSaved() {
    window.location.hash = '/';
  }

  function handleBack() {
    window.location.hash = '/';
  }
</script>

<CreateForm onSaved={handleSaved} onBack={handleBack} showBackButton={true} />
