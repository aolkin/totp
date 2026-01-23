<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import AutoLockSelect from '$lib/components/AutoLockSelect.svelte';
  import ErrorMessage from '$lib/components/ErrorMessage.svelte';
  import { AUTO_LOCK_OPTIONS } from '$lib/auto-lock';

  interface Props {
    mode: 'create' | 'edit';
    username?: string;
    password?: string;
    confirmPassword?: string;
    currentPassword?: string;
    newPassword?: string;
    autoLock?: number;
    changePassword?: boolean;
    error?: string;
  }

  let {
    mode, // eslint-disable-line prefer-const
    username = $bindable(''),
    password = $bindable(''),
    confirmPassword = $bindable(''),
    currentPassword = $bindable(''),
    newPassword = $bindable(''),
    autoLock = $bindable(0),
    changePassword = $bindable(),
    error = $bindable(''),
  }: Props = $props();
</script>

<div class="space-y-4">
  {#if mode === 'create'}
    <div class="space-y-2">
      <Label for="account-username">Username</Label>
      <Input id="account-username" bind:value={username} placeholder="alice@work" />
    </div>
    <div class="space-y-2">
      <Label for="account-password">Password</Label>
      <Input id="account-password" type="password" bind:value={password} />
    </div>
    <div class="space-y-2">
      <Label for="account-confirm">Confirm Password</Label>
      <Input id="account-confirm" type="password" bind:value={confirmPassword} />
    </div>
  {/if}

  <AutoLockSelect
    value={autoLock}
    options={AUTO_LOCK_OPTIONS}
    onValueChange={(value: number) => {
      autoLock = value;
    }}
  />

  {#if mode === 'edit'}
    <div class="flex items-center space-x-2">
      <Checkbox id="account-change-password" bind:checked={changePassword} />
      <Label for="account-change-password" class="text-sm font-medium cursor-pointer">
        Update password
      </Label>
    </div>

    {#if changePassword}
      <div class="space-y-3">
        <div class="text-xs text-muted-foreground">
          Unlock the account before changing its password.
        </div>
        <div class="space-y-2">
          <Label for="account-current-password">Current Password</Label>
          <Input id="account-current-password" type="password" bind:value={currentPassword} />
        </div>
        <div class="space-y-2">
          <Label for="account-new-password">New Password</Label>
          <Input id="account-new-password" type="password" bind:value={newPassword} />
        </div>
        <div class="space-y-2">
          <Label for="account-confirm-new-password">Confirm New Password</Label>
          <Input id="account-confirm-new-password" type="password" bind:value={confirmPassword} />
        </div>
      </div>
    {/if}
  {/if}

  {#if mode === 'create'}
    <div class="rounded-md border border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
      Accounts are stored only in this browser. Deleting an account is permanent.
    </div>
  {/if}

  <ErrorMessage {error} />
</div>
