<script lang="ts">
  import type { HTMLLabelAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils';

  type $$Props = HTMLLabelAttributes;

  let className: string | undefined = undefined;
  export { className as class };
</script>

<label
  class={cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    className,
  )}
  {...$$restProps}
  on:click
>
  <slot />
</label>
