<script lang="ts">
  import { Label } from '$lib/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

  interface Props {
    value: number;
    options: { value: number; label: string }[];
    label?: string;
    onValueChange: (value: number) => void;
  }

  const { value, options, label = 'Auto-lock after inactivity', onValueChange }: Props = $props();

  function handleChange(selected: string | undefined) {
    if (!selected) {
      return;
    }
    const parsed = Number(selected);
    if (!Number.isNaN(parsed)) {
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
      <span>{options.find((option) => option.value === value)?.label ?? String(value)}</span>
    </SelectTrigger>
    <SelectContent>
      {#each options as option}
        <SelectItem value={String(option.value)}>{option.label}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>
