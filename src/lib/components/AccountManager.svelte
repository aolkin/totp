<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import { toast } from 'svelte-sonner';
  import type { Account, UnlockedAccount } from '$lib/types';
  import {
    listAccounts,
    createAccount,
    unlockAccount,
    lockAccount,
    deleteAccount,
    updateAutoLockMinutes,
    changeAccountPassword,
    unlockedAccounts,
  } from '$lib/accounts';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  const AUTO_LOCK_OPTIONS = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 0, label: 'Never' },
  ];

  let accounts = $state<Account[]>([]);
  let unlockedMap = $state<Map<number, UnlockedAccount>>(new Map());
  let loading = $state(false);
  const AUTO_LOCK_REFRESH_INTERVAL = 30000;

  let now = $state(Date.now());

  let createOpen = $state(false);
  let createUsername = $state('');
  let createPassword = $state('');
  let createConfirmPassword = $state('');
  let createAutoLock = $state(15);
  let createError = $state('');

  let unlockOpen = $state(false);
  let unlockTarget = $state<Account | undefined>(undefined);
  let unlockPassword = $state('');
  let unlockError = $state('');

  let editOpen = $state(false);
  let editTarget = $state<Account | undefined>(undefined);
  let editAutoLock = $state(15);
  let editChangePassword = $state(false);
  let editCurrentPassword = $state('');
  let editNewPassword = $state('');
  let editConfirmPassword = $state('');
  let editError = $state('');

  let deleteOpen = $state(false);
  let deleteTarget = $state<Account | undefined>(undefined);

  async function loadAccounts() {
    loading = true;
    try {
      accounts = await listAccounts();
    } catch (error) {
      console.error('Failed to load accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (open) {
      void loadAccounts();
    }
  });

  onMount(() => {
    const unsubscribe = unlockedAccounts.subscribe((map) => {
      unlockedMap = map;
    });
    const timer = window.setInterval(() => {
      now = Date.now();
    }, AUTO_LOCK_REFRESH_INTERVAL);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  });

  function isUnlocked(accountId: number): boolean {
    return unlockedMap.has(accountId);
  }

  function getUnlockedAccount(accountId: number): UnlockedAccount | undefined {
    return unlockedMap.get(accountId);
  }

  function formatAutoLock(minutes: number): string {
    const option = AUTO_LOCK_OPTIONS.find((item) => item.value === minutes);
    return option ? option.label : `${String(minutes)} minutes`;
  }

  function getAutoLockCountdown(account: Account): string | undefined {
    const unlocked = getUnlockedAccount(account.id);
    if (!unlocked || account.autoLockMinutes === 0) {
      return undefined;
    }
    const timeoutMs = account.autoLockMinutes * 60 * 1000;
    const remainingMs = timeoutMs - (now - unlocked.lastActivity);
    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
    return `Auto-locks in ${String(remainingMinutes)}m`;
  }

  function resetCreateForm() {
    createUsername = '';
    createPassword = '';
    createConfirmPassword = '';
    createAutoLock = 15;
    createError = '';
  }

  async function handleCreateAccount() {
    createError = '';
    if (!createUsername.trim()) {
      createError = 'Username is required.';
      return;
    }
    if (createPassword.length < 8) {
      createError = 'Password must be at least 8 characters.';
      return;
    }
    if (createPassword !== createConfirmPassword) {
      createError = 'Passwords do not match.';
      return;
    }
    try {
      await createAccount(createUsername.trim(), createPassword, createAutoLock);
      toast.success('Account created');
      createOpen = false;
      resetCreateForm();
      await loadAccounts();
    } catch (error) {
      createError = error instanceof Error ? error.message : 'Failed to create account.';
    }
  }

  function openUnlockDialog(account: Account) {
    unlockTarget = account;
    unlockPassword = '';
    unlockError = '';
    unlockOpen = true;
  }

  async function handleUnlock() {
    if (!unlockTarget) {
      return;
    }
    unlockError = '';
    try {
      await unlockAccount(unlockTarget.id, unlockPassword);
      toast.success('Account unlocked');
      unlockOpen = false;
      unlockPassword = '';
      await loadAccounts();
    } catch (error) {
      unlockError = error instanceof Error ? error.message : 'Failed to unlock account.';
    }
  }

  function handleLock(accountId: number) {
    lockAccount(accountId);
    toast.success('Account locked');
  }

  function openEditDialog(account: Account) {
    editTarget = account;
    editAutoLock = account.autoLockMinutes;
    editChangePassword = false;
    editCurrentPassword = '';
    editNewPassword = '';
    editConfirmPassword = '';
    editError = '';
    editOpen = true;
  }

  async function handleEditSave() {
    if (!editTarget) {
      return;
    }
    editError = '';
    try {
      await updateAutoLockMinutes(editTarget.id, editAutoLock);
    } catch (error) {
      editError = error instanceof Error ? error.message : 'Failed to update account.';
      return;
    }

    if (editChangePassword) {
      if (!isUnlocked(editTarget.id)) {
        editError = 'Unlock this account before changing its password.';
        return;
      }
      if (editNewPassword.length < 8) {
        editError = 'New password must be at least 8 characters.';
        return;
      }
      if (editNewPassword !== editConfirmPassword) {
        editError = 'New passwords do not match.';
        return;
      }
      if (!editCurrentPassword) {
        editError = 'Enter your current password.';
        return;
      }
      try {
        await changeAccountPassword(editTarget.id, editCurrentPassword, editNewPassword);
      } catch (error) {
        editError = error instanceof Error ? error.message : 'Failed to change password.';
        return;
      }
    }

    toast.success('Account updated');
    editOpen = false;
    await loadAccounts();
  }

  function openDeleteDialog(account: Account) {
    deleteTarget = account;
    deleteOpen = true;
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteAccount(deleteTarget.id);
      toast.success('Account deleted');
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    } finally {
      deleteOpen = false;
      deleteTarget = undefined;
    }
  }

  function handleCreateAutoLockChange(value: string | undefined) {
    if (value) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        createAutoLock = parsed;
      }
    }
  }

  function handleEditAutoLockChange(value: string | undefined) {
    if (value) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        editAutoLock = parsed;
      }
    }
  }
</script>

<Dialog bind:open>
  <DialogContent class="sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Accounts</DialogTitle>
      <DialogDescription>Manage account access and auto-lock settings.</DialogDescription>
    </DialogHeader>

    <div class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="text-sm text-muted-foreground">
          {accounts.length === 0 ? 'No accounts yet.' : `${String(accounts.length)} account(s)`}.
        </div>
        <Button
          size="sm"
          onclick={() => {
            createOpen = true;
          }}>+ New</Button
        >
      </div>

      {#if loading}
        <div class="text-sm text-muted-foreground">Loading accounts...</div>
      {:else if accounts.length === 0}
        <div class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Create your first account to enable secure passphrase storage.
        </div>
      {:else}
        <div class="space-y-3">
          {#each accounts as account (account.id)}
            <div class="rounded-md border bg-card p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="space-y-1">
                  <div class="font-medium">{account.username}</div>
                  <div class="text-sm text-muted-foreground">
                    {isUnlocked(account.id) ? '✅ Unlocked' : '🔒 Locked'} • Auto-lock:{' '}
                    {formatAutoLock(account.autoLockMinutes)}
                  </div>
                  {#if getAutoLockCountdown(account)}
                    <div class="text-xs text-muted-foreground">{getAutoLockCountdown(account)}</div>
                  {/if}
                </div>

                <div class="flex flex-wrap gap-2">
                  {#if isUnlocked(account.id)}
                    <Button
                      size="sm"
                      variant="outline"
                      onclick={() => {
                        handleLock(account.id);
                      }}
                    >
                      Lock
                    </Button>
                  {:else}
                    <Button
                      size="sm"
                      onclick={() => {
                        openUnlockDialog(account);
                      }}>Unlock</Button
                    >
                  {/if}
                  <Button
                    size="sm"
                    variant="outline"
                    onclick={() => {
                      openEditDialog(account);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onclick={() => {
                      openDeleteDialog(account);
                    }}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </DialogContent>
</Dialog>

<Dialog bind:open={createOpen}>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Create Account</DialogTitle>
      <DialogDescription>Passwords cannot be recovered.</DialogDescription>
    </DialogHeader>
    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="create-username">Username</Label>
        <Input id="create-username" bind:value={createUsername} placeholder="alice@work" />
      </div>
      <div class="space-y-2">
        <Label for="create-password">Password</Label>
        <Input id="create-password" type="password" bind:value={createPassword} />
      </div>
      <div class="space-y-2">
        <Label for="create-confirm">Confirm Password</Label>
        <Input id="create-confirm" type="password" bind:value={createConfirmPassword} />
      </div>
      <div class="space-y-2">
        <Label>Auto-lock after inactivity</Label>
        <Select
          type="single"
          value={String(createAutoLock)}
          onValueChange={handleCreateAutoLockChange}
        >
          <SelectTrigger class="w-full">
            <span>{formatAutoLock(createAutoLock)}</span>
          </SelectTrigger>
          <SelectContent>
            {#each AUTO_LOCK_OPTIONS as option}
              <SelectItem value={String(option.value)}>{option.label}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
      <div class="rounded-md border border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
        Accounts are stored only in this browser. Deleting an account is permanent.
      </div>
      {#if createError}
        <div
          class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {createError}
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          createOpen = false;
        }}>Cancel</Button
      >
      <Button onclick={handleCreateAccount}>Create Account</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog bind:open={unlockOpen}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Unlock Account</DialogTitle>
      <DialogDescription>Account: {unlockTarget?.username}</DialogDescription>
    </DialogHeader>
    <div class="space-y-3">
      <Label for="unlock-password">Password</Label>
      <Input id="unlock-password" type="password" bind:value={unlockPassword} />
      {#if unlockError}
        <div
          class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {unlockError}
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          unlockOpen = false;
        }}>Cancel</Button
      >
      <Button onclick={handleUnlock}>Unlock</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog bind:open={editOpen}>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Edit Account: {editTarget?.username}</DialogTitle>
      <DialogDescription>Update auto-lock and password settings.</DialogDescription>
    </DialogHeader>
    <div class="space-y-4">
      <div class="space-y-2">
        <Label>Auto-lock after inactivity</Label>
        <Select type="single" value={String(editAutoLock)} onValueChange={handleEditAutoLockChange}>
          <SelectTrigger class="w-full">
            <span>{formatAutoLock(editAutoLock)}</span>
          </SelectTrigger>
          <SelectContent>
            {#each AUTO_LOCK_OPTIONS as option}
              <SelectItem value={String(option.value)}>{option.label}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center space-x-2">
        <Checkbox id="edit-change-password" bind:checked={editChangePassword} />
        <Label for="edit-change-password" class="text-sm font-medium cursor-pointer">
          Update password
        </Label>
      </div>

      {#if editChangePassword}
        <div class="space-y-3">
          <div class="text-xs text-muted-foreground">
            Unlock the account before changing its password.
          </div>
          <div class="space-y-2">
            <Label for="edit-current-password">Current Password</Label>
            <Input id="edit-current-password" type="password" bind:value={editCurrentPassword} />
          </div>
          <div class="space-y-2">
            <Label for="edit-new-password">New Password</Label>
            <Input id="edit-new-password" type="password" bind:value={editNewPassword} />
          </div>
          <div class="space-y-2">
            <Label for="edit-confirm-password">Confirm New Password</Label>
            <Input id="edit-confirm-password" type="password" bind:value={editConfirmPassword} />
          </div>
        </div>
      {/if}

      {#if editError}
        <div
          class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {editError}
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          editOpen = false;
        }}>Cancel</Button
      >
      <Button onclick={handleEditSave}>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog bind:open={deleteOpen}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Delete Account?</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete "{deleteTarget?.username}"? This action is permanent.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          deleteOpen = false;
        }}>Cancel</Button
      >
      <Button variant="destructive" onclick={handleDelete}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
