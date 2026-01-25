<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import AccountForm from '$lib/components/AccountForm.svelte';

  interface Props {
    open: boolean;
    onCreate: (username: string, password: string, autoLock: number) => void | Promise<void>;
    onCancel: () => void;
  }

  const { open, onCreate, onCancel }: Props = $props();

  let formState = $state({
    username: '',
    password: '',
    confirmPassword: '',
    autoLock: 15,
    error: '',
  });

  function resetForm() {
    formState = {
      username: '',
      password: '',
      confirmPassword: '',
      autoLock: 15,
      error: '',
    };
  }

  async function handleCreate() {
    formState.error = '';
    if (!formState.username.trim()) {
      formState.error = 'Username is required.';
      return;
    }
    if (formState.password.length < 8) {
      formState.error = 'Password must be at least 8 characters';
      return;
    }
    if (formState.password !== formState.confirmPassword) {
      formState.error = 'Passwords do not match';
      return;
    }

    try {
      await onCreate(formState.username.trim(), formState.password, formState.autoLock);
      resetForm();
    } catch (err) {
      formState.error = err instanceof Error ? err.message : 'Failed to create account';
    }
  }

  function handleCancel() {
    resetForm();
    onCancel();
  }

  $effect(() => {
    if (!open) {
      resetForm();
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
      <DialogTitle>Create Account</DialogTitle>
      <DialogDescription>Passwords cannot be recovered.</DialogDescription>
    </DialogHeader>
    <AccountForm
      mode="create"
      bind:username={formState.username}
      bind:password={formState.password}
      bind:confirmPassword={formState.confirmPassword}
      bind:autoLock={formState.autoLock}
      bind:error={formState.error}
    />
    <DialogFooter>
      <Button variant="outline" onclick={handleCancel}>Cancel</Button>
      <Button onclick={handleCreate}>Create Account</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
