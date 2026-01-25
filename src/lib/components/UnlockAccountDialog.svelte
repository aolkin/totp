<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import type { Account } from '$lib/types';

  interface Props {
    open: boolean;
    account?: Account;
    error?: string;
    onUnlock: (password: string) => void | Promise<void>;
    onCancel: () => void;
  }

  const { open, account, error = '', onUnlock, onCancel }: Props = $props();

  let password = $state('');

  async function handleUnlock() {
    await onUnlock(password);
  }

  function handleCancel() {
    password = '';
    onCancel();
  }

  $effect(() => {
    if (!open) {
      password = '';
    }
  });
</script>

<Dialog
  {open}
  onOpenChange={(isOpen) => {
    if (!isOpen) handleCancel();
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Unlock Account</DialogTitle>
      <DialogDescription>Account: {account?.username ?? ''}</DialogDescription>
    </DialogHeader>
    <div class="space-y-3">
      <Label for="unlock-password">Password</Label>
      <Input id="unlock-password" type="password" bind:value={password} />
      {#if error}
        <div class="text-sm text-destructive">{error}</div>
      {/if}
    </div>
    <DialogFooter>
      <Button variant="outline" onclick={handleCancel}>Cancel</Button>
      <Button onclick={handleUnlock}>Unlock</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
