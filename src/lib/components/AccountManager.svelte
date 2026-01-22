<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import AutoLockSelect from '$lib/components/AutoLockSelect.svelte';
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

  const AUTO_LOCK_OPTIONS: { value: number; label: string }[] = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 0, label: 'Never' },
  ];

  const DEFAULT_AUTO_LOCK_MINUTES = 15;

  let accounts = $state<Account[]>([]);
  let unlockedMap = $state<Map<number, UnlockedAccount>>(new Map());
  let loading = $state(false);
  const AUTO_LOCK_REFRESH_INTERVAL = 30000;

  let now = $state(Date.now());

  interface CreateDialogState {
    open: boolean;
    username: string;
    password: string;
    confirmPassword: string;
    autoLock: number;
    error: string;
  }

  interface UnlockDialogState {
    open: boolean;
    target: Account | undefined;
    password: string;
    error: string;
  }

  interface EditDialogState {
    open: boolean;
    target: Account | undefined;
    autoLock: number;
    changePassword: boolean;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    error: string;
  }

  interface DeleteDialogState {
    open: boolean;
    target: Account | undefined;
  }

  const createDialog = $state<CreateDialogState>({
    open: false,
    username: '',
    password: '',
    confirmPassword: '',
    autoLock: DEFAULT_AUTO_LOCK_MINUTES,
    error: '',
  });

  const unlockDialog = $state<UnlockDialogState>({
    open: false,
    target: undefined,
    password: '',
    error: '',
  });

  const editDialog = $state<EditDialogState>({
    open: false,
    target: undefined,
    autoLock: DEFAULT_AUTO_LOCK_MINUTES,
    changePassword: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    error: '',
  });

  const deleteDialog = $state<DeleteDialogState>({
    open: false,
    target: undefined,
  });

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
    createDialog.username = '';
    createDialog.password = '';
    createDialog.confirmPassword = '';
    createDialog.autoLock = DEFAULT_AUTO_LOCK_MINUTES;
    createDialog.error = '';
  }

  async function handleCreateAccount() {
    createDialog.error = '';
    if (!createDialog.username.trim()) {
      createDialog.error = 'Username is required.';
      return;
    }
    if (createDialog.password.length < 8) {
      createDialog.error = 'Password must be at least 8 characters.';
      return;
    }
    if (createDialog.password !== createDialog.confirmPassword) {
      createDialog.error = 'Passwords do not match.';
      return;
    }
    try {
      await createAccount(
        createDialog.username.trim(),
        createDialog.password,
        createDialog.autoLock,
      );
      toast.success('Account created');
      createDialog.open = false;
      resetCreateForm();
      await loadAccounts();
    } catch (error) {
      createDialog.error = error instanceof Error ? error.message : 'Failed to create account.';
    }
  }

  function openUnlockDialog(account: Account) {
    unlockDialog.target = account;
    unlockDialog.password = '';
    unlockDialog.error = '';
    unlockDialog.open = true;
  }

  async function handleUnlock() {
    if (!unlockDialog.target) {
      return;
    }
    unlockDialog.error = '';
    try {
      await unlockAccount(unlockDialog.target.id, unlockDialog.password);
      toast.success('Account unlocked');
      unlockDialog.open = false;
      unlockDialog.password = '';
      await loadAccounts();
    } catch (error) {
      unlockDialog.error = error instanceof Error ? error.message : 'Failed to unlock account.';
    }
  }

  function handleLock(accountId: number) {
    lockAccount(accountId);
    toast.success('Account locked');
  }

  function openEditDialog(account: Account) {
    editDialog.target = account;
    editDialog.autoLock = account.autoLockMinutes;
    editDialog.changePassword = false;
    editDialog.currentPassword = '';
    editDialog.newPassword = '';
    editDialog.confirmPassword = '';
    editDialog.error = '';
    editDialog.open = true;
  }

  async function handleEditSave() {
    if (!editDialog.target) {
      return;
    }
    editDialog.error = '';
    try {
      await updateAutoLockMinutes(editDialog.target.id, editDialog.autoLock);
    } catch (error) {
      editDialog.error = error instanceof Error ? error.message : 'Failed to update account.';
      return;
    }

    if (editDialog.changePassword) {
      if (!isUnlocked(editDialog.target.id)) {
        editDialog.error = 'Unlock this account before changing its password.';
        return;
      }
      if (editDialog.newPassword.length < 8) {
        editDialog.error = 'New password must be at least 8 characters.';
        return;
      }
      if (editDialog.newPassword !== editDialog.confirmPassword) {
        editDialog.error = 'New passwords do not match.';
        return;
      }
      if (!editDialog.currentPassword) {
        editDialog.error = 'Enter your current password.';
        return;
      }
      try {
        await changeAccountPassword(
          editDialog.target.id,
          editDialog.currentPassword,
          editDialog.newPassword,
        );
      } catch (error) {
        editDialog.error = error instanceof Error ? error.message : 'Failed to change password.';
        return;
      }
    }

    toast.success('Account updated');
    editDialog.open = false;
    await loadAccounts();
  }

  function openDeleteDialog(account: Account) {
    deleteDialog.target = account;
    deleteDialog.open = true;
  }

  async function handleDelete() {
    if (!deleteDialog.target) {
      return;
    }
    try {
      await deleteAccount(deleteDialog.target.id);
      toast.success('Account deleted');
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    } finally {
      deleteDialog.open = false;
      deleteDialog.target = undefined;
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
            createDialog.open = true;
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
                    {AUTO_LOCK_OPTIONS.find((option) => option.value === account.autoLockMinutes)
                      ?.label ?? String(account.autoLockMinutes)}
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

<Dialog bind:open={createDialog.open}>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Create Account</DialogTitle>
      <DialogDescription>Passwords cannot be recovered.</DialogDescription>
    </DialogHeader>
    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="create-username">Username</Label>
        <Input id="create-username" bind:value={createDialog.username} placeholder="alice@work" />
      </div>
      <div class="space-y-2">
        <Label for="create-password">Password</Label>
        <Input id="create-password" type="password" bind:value={createDialog.password} />
      </div>
      <div class="space-y-2">
        <Label for="create-confirm">Confirm Password</Label>
        <Input id="create-confirm" type="password" bind:value={createDialog.confirmPassword} />
      </div>
      <AutoLockSelect
        value={createDialog.autoLock}
        options={AUTO_LOCK_OPTIONS}
        onValueChange={(value: number) => {
          createDialog.autoLock = value;
        }}
      />
      <div class="rounded-md border border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
        Accounts are stored only in this browser. Deleting an account is permanent.
      </div>
      {#if createDialog.error}
        <div
          class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {createDialog.error}
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          createDialog.open = false;
        }}>Cancel</Button
      >
      <Button onclick={handleCreateAccount}>Create Account</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog bind:open={unlockDialog.open}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Unlock Account</DialogTitle>
      <DialogDescription>Account: {unlockDialog.target?.username}</DialogDescription>
    </DialogHeader>
    <div class="space-y-3">
      <Label for="unlock-password">Password</Label>
      <Input id="unlock-password" type="password" bind:value={unlockDialog.password} />
      {#if unlockDialog.error}
        <div
          class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {unlockDialog.error}
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          unlockDialog.open = false;
        }}>Cancel</Button
      >
      <Button onclick={handleUnlock}>Unlock</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog bind:open={editDialog.open}>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Edit Account: {editDialog.target?.username}</DialogTitle>
      <DialogDescription>Update auto-lock and password settings.</DialogDescription>
    </DialogHeader>
    <div class="space-y-4">
      <AutoLockSelect
        value={editDialog.autoLock}
        options={AUTO_LOCK_OPTIONS}
        onValueChange={(value: number) => {
          editDialog.autoLock = value;
        }}
      />

      <div class="flex items-center space-x-2">
        <Checkbox id="edit-change-password" bind:checked={editDialog.changePassword} />
        <Label for="edit-change-password" class="text-sm font-medium cursor-pointer">
          Update password
        </Label>
      </div>

      {#if editDialog.changePassword}
        <div class="space-y-3">
          <div class="text-xs text-muted-foreground">
            Unlock the account before changing its password.
          </div>
          <div class="space-y-2">
            <Label for="edit-current-password">Current Password</Label>
            <Input
              id="edit-current-password"
              type="password"
              bind:value={editDialog.currentPassword}
            />
          </div>
          <div class="space-y-2">
            <Label for="edit-new-password">New Password</Label>
            <Input id="edit-new-password" type="password" bind:value={editDialog.newPassword} />
          </div>
          <div class="space-y-2">
            <Label for="edit-confirm-password">Confirm New Password</Label>
            <Input
              id="edit-confirm-password"
              type="password"
              bind:value={editDialog.confirmPassword}
            />
          </div>
        </div>
      {/if}

      {#if editDialog.error}
        <div
          class="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {editDialog.error}
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          editDialog.open = false;
        }}>Cancel</Button
      >
      <Button onclick={handleEditSave}>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog bind:open={deleteDialog.open}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Delete Account?</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete "{deleteDialog.target?.username}"? This action is permanent.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        onclick={() => {
          deleteDialog.open = false;
        }}>Cancel</Button
      >
      <Button variant="destructive" onclick={handleDelete}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
