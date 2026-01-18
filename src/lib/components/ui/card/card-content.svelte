<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type $$Props = Omit<HTMLAttributes<HTMLDivElement>, 'class'> & {
    class?: string;
  };

  let className: string | undefined = undefined;
  export { className as class };
</script>

<div class={cn('p-6 pt-0', className)} {...$$restProps}>
  <slot />
</div>
