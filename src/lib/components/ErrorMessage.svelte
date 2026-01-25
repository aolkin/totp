<script lang="ts">
  interface Props {
    error: string;
  }

  const { error }: Props = $props();
</script>

{#if error}
  <div
    class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
  >
    {error}
  </div>
{/if}
