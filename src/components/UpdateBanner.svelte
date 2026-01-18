<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';

  interface Props {
    visible?: boolean;
    onUpdate?: () => void;
    onDismiss?: () => void;
  }

  const { visible = false, onUpdate, onDismiss }: Props = $props();

  function handleUpdate() {
    if (onUpdate) {
      onUpdate();
    }
  }

  function handleDismiss() {
    if (onDismiss) {
      onDismiss();
    }
  }
</script>

{#if visible}
  <div class="fixed top-0 left-0 right-0 z-50 p-4">
    <Card class="mx-auto max-w-2xl border-blue-500 bg-blue-50">
      <CardContent class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 text-2xl">🔄</div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-blue-900 mb-2">Update Available</h2>
            <p class="text-sm text-blue-800 mb-4">New version with improvements is available.</p>
            <div class="flex gap-2 flex-wrap">
              <Button onclick={handleUpdate} size="sm">Update Now</Button>
              <Button onclick={handleDismiss} variant="outline" size="sm">Later</Button>
            </div>
          </div>
          <button
            onclick={handleDismiss}
            class="flex-shrink-0 text-blue-700 hover:text-blue-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
{/if}
