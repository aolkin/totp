<script lang="ts">
  import { Label } from '$lib/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { formatAutoLockLabel, type AutoLockOption } from '$lib/auto-lock';

  interface Props {
    value: number;
    options: AutoLockOption[];
    label?: string;
    onValueChange: (value: number) => void;
  }

  const { value, options, label = 'Auto-lock after inactivity', onValueChange }: Props = $props();

  function handleChange(selected: string | undefined) {
    if (!selected) {
      return;
    }
    const parsed = Number(selected);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onValueChange(parsed);
    }
  }
</script>

<div class="space-y-2">
  <Label>{label}</Label>
  <Select
    type="single"
    value={String(value)}
    onValueChange={(selected: string | undefined) => {
      handleChange(selected);
    }}
  >
    <SelectTrigger class="w-full">
      <span>{formatAutoLockLabel(options, value)}</span>
    </SelectTrigger>
    <SelectContent>
      {#each options as option}
        <SelectItem value={String(option.value)}>{option.label}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>
