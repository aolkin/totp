<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import AccountForm from '$lib/components/AccountForm.svelte';
  import ErrorMessage from '$lib/components/ErrorMessage.svelte';
  import {
    AUTO_LOCK_OPTIONS,
    DEFAULT_AUTO_LOCK_MINUTES,
    formatAutoLockLabel,
  } from '$lib/auto-lock';
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

  let accounts = $state<Account[]>([]);
  let unlockedMap = $state<Map<number, UnlockedAccount>>(new Map());
  let loading = $state(false);
  const AUTO_LOCK_REFRESH_INTERVAL = 30000;

  let now = $state(Date.now());

  let activeDialog = $state<'create' | 'unlock' | 'edit' | 'delete' | undefined>(undefined);
  let targetAccount = $state<Account | undefined>(undefined);

  const successMessages = {
    create: 'Account created',
    unlock: 'Account unlocked',
    edit: 'Account updated',
    delete: 'Account deleted',
    lock: 'Account locked',
  };

  const dialogConfig = $derived(() => {
    const configs = {
      create: {
        title: 'Create Account',
        description: 'Passwords cannot be recovered.',
        submitText: 'Create Account',
        submitVariant: 'default' as const,
      },
      unlock: {
        title: 'Unlock Account',
        description: `Account: ${targetAccount?.username}`,
        submitText: 'Unlock',
        submitVariant: 'default' as const,
      },
      edit: {
        title: `Edit Account: ${targetAccount?.username}`,
        description: 'Update auto-lock and password settings.',
        submitText: 'Save Changes',
        submitVariant: 'default' as const,
      },
      delete: {
        title: 'Delete Account?',
        description: `Are you sure you want to delete "${targetAccount?.username}"? This action is permanent.`,
        submitText: 'Delete',
        submitVariant: 'destructive' as const,
      },
    };
    return activeDialog ? configs[activeDialog] : null;
  });

  const formState = $state({
    username: '',
    password: '',
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
    autoLock: DEFAULT_AUTO_LOCK_MINUTES,
    changePassword: false,
    error: '',
  });

  function resetForm() {
    formState.username = '';
    formState.password = '';
    formState.confirmPassword = '';
    formState.currentPassword = '';
    formState.newPassword = '';
    formState.autoLock = DEFAULT_AUTO_LOCK_MINUTES;
    formState.changePassword = false;
    formState.error = '';
  }

  function validatePassword(password: string, confirmPassword: string): string | undefined {
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return undefined;
  }

  function openDialog(type: 'create' | 'unlock' | 'edit' | 'delete', account?: Account) {
    targetAccount = account;
    if (type === 'create' || type === 'unlock') {
      resetForm();
    } else if (type === 'edit' && account) {
      formState.autoLock = account.autoLockMinutes;
      formState.changePassword = false;
      formState.currentPassword = '';
      formState.newPassword = '';
      formState.confirmPassword = '';
      formState.error = '';
    }
    activeDialog = type;
  }

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

  async function handleCreateAccount() {
    formState.error = '';
    if (!formState.username.trim()) {
      formState.error = 'Username is required.';
      return;
    }
    const passwordError = validatePassword(formState.password, formState.confirmPassword);
    if (passwordError) {
      formState.error = passwordError;
      return;
    }
    try {
      await createAccount(formState.username.trim(), formState.password, formState.autoLock);
      toast.success(successMessages.create);
      activeDialog = undefined;
      resetForm();
      await loadAccounts();
    } catch (error) {
      formState.error = error instanceof Error ? error.message : 'Failed to create account.';
    }
  }

  async function handleUnlock() {
    if (!targetAccount) return;
    formState.error = '';
    try {
      await unlockAccount(targetAccount.id, formState.password);
      toast.success(successMessages.unlock);
      activeDialog = undefined;
      await loadAccounts();
    } catch (error) {
      formState.error = error instanceof Error ? error.message : 'Failed to unlock account.';
    }
  }

  function handleLock(accountId: number) {
    lockAccount(accountId);
    toast.success(successMessages.lock);
  }

  async function handleEditSave() {
    if (!targetAccount) return;
    formState.error = '';
    try {
      await updateAutoLockMinutes(targetAccount.id, formState.autoLock);
    } catch (error) {
      formState.error = error instanceof Error ? error.message : 'Failed to update account.';
      return;
    }

    if (formState.changePassword) {
      if (!isUnlocked(targetAccount.id)) {
        formState.error = 'Unlock this account before changing its password.';
        return;
      }
      if (!formState.currentPassword) {
        formState.error = 'Enter your current password.';
        return;
      }
      const passwordError = validatePassword(formState.newPassword, formState.confirmPassword);
      if (passwordError) {
        formState.error = passwordError;
        return;
      }
      try {
        await changeAccountPassword(
          targetAccount.id,
          formState.currentPassword,
          formState.newPassword,
        );
      } catch (error) {
        formState.error = error instanceof Error ? error.message : 'Failed to change password.';
        return;
      }
    }

    toast.success(successMessages.edit);
    activeDialog = undefined;
    await loadAccounts();
  }

  async function handleDelete() {
    if (!targetAccount) return;
    try {
      await deleteAccount(targetAccount.id);
      toast.success(successMessages.delete);
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
    } finally {
      activeDialog = undefined;
      targetAccount = undefined;
    }
  }

  async function handleSubmit() {
    switch (activeDialog) {
      case 'create':
        await handleCreateAccount();
        break;
      case 'unlock':
        await handleUnlock();
        break;
      case 'edit':
        await handleEditSave();
        break;
      case 'delete':
        await handleDelete();
        break;
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
            openDialog('create');
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
                    {formatAutoLockLabel(AUTO_LOCK_OPTIONS, account.autoLockMinutes)}
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
                        openDialog('unlock', account);
                      }}>Unlock</Button
                    >
                  {/if}
                  <Button
                    size="sm"
                    variant="outline"
                    onclick={() => {
                      openDialog('edit', account);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onclick={() => {
                      openDialog('delete', account);
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

{#if dialogConfig}
  <Dialog
    open={true}
    onOpenChange={(isOpen) => {
      if (!isOpen) activeDialog = undefined;
    }}
  >
    <DialogContent class={activeDialog === 'create' || activeDialog === 'edit' ? 'sm:max-w-lg' : 'sm:max-w-md'}>
      <DialogHeader>
        <DialogTitle>{dialogConfig.title}</DialogTitle>
        <DialogDescription>{dialogConfig.description}</DialogDescription>
      </DialogHeader>

      {#if activeDialog === 'create'}
        <AccountForm
          mode="create"
          bind:username={formState.username}
          bind:password={formState.password}
          bind:confirmPassword={formState.confirmPassword}
          bind:autoLock={formState.autoLock}
          bind:error={formState.error}
        />
      {:else if activeDialog === 'unlock'}
        <div class="space-y-3">
          <Label for="unlock-password">Password</Label>
          <Input id="unlock-password" type="password" bind:value={formState.password} />
          <ErrorMessage error={formState.error} />
        </div>
      {:else if activeDialog === 'edit'}
        <AccountForm
          mode="edit"
          bind:autoLock={formState.autoLock}
          bind:changePassword={formState.changePassword}
          bind:currentPassword={formState.currentPassword}
          bind:newPassword={formState.newPassword}
          bind:confirmPassword={formState.confirmPassword}
          bind:error={formState.error}
        />
      {/if}

      <DialogFooter>
        <Button
          variant="outline"
          onclick={() => {
            activeDialog = undefined;
          }}>Cancel</Button
        >
        <Button variant={dialogConfig.submitVariant} onclick={handleSubmit}>
          {dialogConfig.submitText}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
{/if}
