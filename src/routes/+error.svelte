<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';

  onMount(() => {
    // Redirect unknown routes to home after brief delay
    const timeout = setTimeout(() => {
      void goto('#/');
    }, 3000);
    return () => {
      clearTimeout(timeout);
    };
  });

  function handleGoHome() {
    void goto('#/');
  }
</script>

<div class="text-center p-8">
  <h2 class="text-2xl font-semibold mb-4">Page Not Found</h2>
  <p class="text-muted-foreground mb-4">Redirecting to home...</p>
  <Button onclick={handleGoHome}>Go Home Now</Button>
</div>
