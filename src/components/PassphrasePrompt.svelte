<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';

  interface Props {
    onUnlock: (passphrase: string) => void;
    error?: string;
  }

  let { onUnlock, error = '' }: Props = $props();

  let passphrase = $state('');

  function handleSubmit() {
    onUnlock(passphrase);
  }
</script>

<Card class="w-full max-w-md text-center">
  <CardHeader>
    <h2 class="text-2xl font-semibold">Enter Passphrase</h2>
    <p class="text-muted-foreground">This TOTP is protected with a passphrase.</p>
  </CardHeader>
  <CardContent>
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <div>
        <Input
          type="password"
          bind:value={passphrase}
          placeholder="Enter your passphrase"
          autocomplete="off"
        />
      </div>

      {#if error}
        <div class="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
          {error}
        </div>
      {/if}

      <Button type="submit" class="w-full">
        Unlock
      </Button>
    </form>
  </CardContent>
</Card>
