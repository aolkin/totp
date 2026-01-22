<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';

  interface Props {
    onUnlock: (passphrase: string) => void;
    error?: string;
    label?: string;
    hint?: string;
  }

  const { onUnlock, error = '', label, hint }: Props = $props();

  let passphrase = $state('');

  function handleSubmit() {
    onUnlock(passphrase);
  }
</script>

<Card class="w-full max-w-md text-center">
  <CardHeader>
    <h2 class="text-2xl font-semibold">Enter Passphrase</h2>
    {#if label}
      <p class="text-lg font-medium">{label}</p>
    {/if}
    <p class="text-muted-foreground">This TOTP is protected with a passphrase.</p>
  </CardHeader>
  <CardContent>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      class="space-y-4"
    >
      {#if hint}
        <div class="flex items-center justify-center gap-2">
          <Badge variant="secondary">Hint: {hint}</Badge>
        </div>
      {/if}

      <div>
        <Input
          type="password"
          bind:value={passphrase}
          placeholder="Enter your passphrase"
          autocomplete="off"
        />
      </div>

      {#if error}
        <div
          class="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm"
        >
          {error}
        </div>
      {/if}

      <Button type="submit" class="w-full">Unlock</Button>

      <a
        href="#/"
        class="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
      >
        Back to List
      </a>
    </form>
  </CardContent>
</Card>
