<script lang="ts">
  import { onMount } from 'svelte';
  import {
    generate,
    regenerateWord,
    getPoolSize,
    type Separator,
    type GeneratedPassphrase,
  } from '$lib/passphrase-generator';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Label } from '$lib/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { Switch } from '$lib/components/ui/switch';
  import { Slider } from '$lib/components/ui/slider';
  import { toast } from 'svelte-sonner';

  let wordCount = $state(6);
  let separator = $state<Separator>('-');
  let easyWordsOnly = $state(false);
  let result = $state<GeneratedPassphrase | undefined>(undefined);
  let mounted = $state(false);

  const poolSize = $derived(getPoolSize(easyWordsOnly));

  function doGenerate() {
    result = generate({ wordCount, separator, easyWordsOnly });
  }

  function handleWordClick(index: number) {
    if (!result) return;
    result = regenerateWord(result.words, index, easyWordsOnly, separator);
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.passphrase);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }

  function handleSeparatorChange(value: string | undefined) {
    if (value === undefined) return;
    const map: Record<string, Separator> = {
      dash: '-',
      space: ' ',
      dot: '.',
      none: '',
    };
    separator = map[value] ?? '-';
  }

  const separatorKey = $derived(
    separator === '-' ? 'dash' : separator === ' ' ? 'space' : separator === '.' ? 'dot' : 'none',
  );

  const separatorLabel = $derived(
    separator === '-' ? 'Dash' : separator === ' ' ? 'Space' : separator === '.' ? 'Dot' : 'None',
  );

  onMount(() => {
    mounted = true;
    doGenerate();
  });

  $effect(() => {
    if (!mounted) return;
    // Re-generate when options change
    void wordCount;
    void separator;
    void easyWordsOnly;
    doGenerate();
  });
</script>

<Card class="w-full max-w-lg">
  <CardHeader>
    <h2 class="text-2xl font-semibold">Passphrase Generator</h2>
  </CardHeader>
  <CardContent class="space-y-6">
    {#if result}
      <div class="rounded-md border bg-muted/50 p-4">
        <div class="flex flex-wrap items-center justify-center gap-1 font-mono text-lg">
          {#each result.words as word, i (i)}
            {#if i > 0 && separator}
              <span class="text-muted-foreground">{separator}</span>
            {/if}
            <button
              type="button"
              class="cursor-pointer rounded px-1 py-0.5 hover:bg-primary/10 hover:text-primary transition-colors"
              title="Click to regenerate this word"
              onclick={() => {
                handleWordClick(i);
              }}
            >
              {word}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Badge variant="secondary">{result.entropyBits} bits entropy</Badge>
        <Badge
          variant={result.comfortLevel === 'Excellent' || result.comfortLevel === 'Good'
            ? 'default'
            : 'outline'}
        >
          {result.comfortLevel} ({result.comfortScore})
        </Badge>
        <Badge variant="outline">{wordCount} words</Badge>
      </div>

      <div class="flex gap-2">
        <Button class="flex-1" onclick={doGenerate}>Generate</Button>
        <Button variant="outline" class="flex-1" onclick={handleCopy}>Copy</Button>
      </div>
    {/if}

    <div class="space-y-4 rounded-md border p-4">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Word count</Label>
          <span class="text-sm font-medium tabular-nums">{wordCount}</span>
        </div>
        <Slider type="single" bind:value={wordCount} min={3} max={10} step={1} />
      </div>

      <div class="space-y-2">
        <Label>Separator</Label>
        <Select type="single" value={separatorKey} onValueChange={handleSeparatorChange}>
          <SelectTrigger class="w-full">
            <span>{separatorLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dash">Dash (-)</SelectItem>
            <SelectItem value="space">Space</SelectItem>
            <SelectItem value="dot">Dot (.)</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="space-y-0.5">
          <Label>Easy to type</Label>
          <p class="text-sm text-muted-foreground">
            Filter to comfortable words ({poolSize.toLocaleString()} word pool)
          </p>
        </div>
        <Switch bind:checked={easyWordsOnly} />
      </div>
    </div>
  </CardContent>
</Card>
