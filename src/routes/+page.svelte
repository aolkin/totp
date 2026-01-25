<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { Separator } from '$lib/components/ui/separator';
  import { Badge } from '$lib/components/ui/badge';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '$lib/components/ui/dropdown-menu';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import type { TOTPRecord, TOTPExport, Account } from '$lib/types';
  import { totpStorage } from '$lib/storage';
  import { generateShareableURL, encodeToURL } from '$lib/crypto';
  import { accountRepository, unlockedAccounts } from '$lib/accounts';
  import { toast } from 'svelte-sonner';

  type SortOption = 'recent' | 'alphabetical' | 'created';

  let records = $state<TOTPRecord[]>([]);
  let accounts = $state<Account[]>([]);
  let unlockedMap = $state(new Map());
  let searchQuery = $state('');
  let sortOption = $state<SortOption>('recent');
  let deleteDialogOpen = $state(false);
  let recordToDelete = $state<TOTPRecord | undefined>(undefined);
  let fileInput: HTMLInputElement | undefined;

  onMount(() => {
    void loadAccounts();
    const unsub = unlockedAccounts.subscribe((map) => {
      unlockedMap = map;
    });
    return unsub;
  });

  async function loadAccounts() {
    try {
      accounts = await accountRepository.getAll();
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }

  function getAccountForRecord(record: TOTPRecord): Account | undefined {
    if (!record.savedWithAccount) return undefined;
    return accounts.find((a) => a.id === record.savedWithAccount);
  }

  function isAccountUnlocked(accountId: number): boolean {
    return unlockedMap.has(accountId);
  }

  function getViewUrl(record: TOTPRecord): string {
    const encoded = encodeToURL(record.encrypted);
    return `#/view/${encodeURIComponent(encoded)}`;
  }

  const filteredRecords = $derived(() => {
    let result = records;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => r.label.toLowerCase().includes(query));
    }

    const sortable = [...result];

    switch (sortOption) {
      case 'recent':
        return sortable.sort((a, b) => b.lastUsed - a.lastUsed);
      case 'alphabetical':
        return sortable.sort((a, b) => a.label.localeCompare(b.label));
      case 'created':
        return sortable.sort((a, b) => b.created - a.created);
      default:
        return sortable;
    }
  });

  async function loadRecords() {
    try {
      records = await totpStorage.getAll();
    } catch (error) {
      console.error('Failed to load records:', error);
      toast.error('Failed to load saved TOTPs');
    }
  }

  $effect(() => {
    void loadRecords();
  });

  function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (months > 0) return `${String(months)} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${String(weeks)} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${String(days)} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${String(hours)} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${String(minutes)} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  async function handleExportUrl(record: TOTPRecord) {
    try {
      await navigator.clipboard.writeText(generateShareableURL(record.encrypted));
      toast.success('URL copied to clipboard');
    } catch {
      toast.error('Failed to export URL');
    }
  }

  function confirmDelete(record: TOTPRecord) {
    recordToDelete = record;
    deleteDialogOpen = true;
  }

  async function handleDelete() {
    if (!recordToDelete) return;

    try {
      const { deletePassphrasesForTotp } = await import('$lib/passphrase-storage');
      await deletePassphrasesForTotp(recordToDelete.id);
      await totpStorage.delete(recordToDelete.id);
      const idToDelete = recordToDelete.id;
      records = records.filter((r) => r.id !== idToDelete);
      toast.success('TOTP deleted');
    } catch {
      toast.error('Failed to delete TOTP');
    } finally {
      deleteDialogOpen = false;
      recordToDelete = undefined;
    }
  }

  async function handleExportAll() {
    try {
      const data = await totpStorage.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `totp-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported');
    } catch {
      toast.error('Failed to export backup');
    }
  }

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const data = JSON.parse(text) as TOTPExport;

        if (data.version !== 1 || !Array.isArray(data.totps)) {
          throw new Error('Invalid backup file format');
        }

        const imported = await totpStorage.importAll(data);
        toast.success(`Imported ${String(imported)} TOTP${imported !== 1 ? 's' : ''}`);
        await loadRecords();
      } catch {
        toast.error('Failed to import backup file');
      }
      input.value = '';
    }
  }

  function handleSortChange(value: string | undefined) {
    if (value) {
      sortOption = value as SortOption;
    }
  }
</script>

<input
  type="file"
  accept=".json"
  class="hidden"
  bind:this={fileInput}
  onchange={handleFileSelect}
/>

<Card class="w-full max-w-2xl">
  <CardHeader>
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">Saved TOTPs</h2>
      <a
        href="#/create"
        class="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        + Add New
      </a>
    </div>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="flex gap-2 flex-col sm:flex-row">
      <Input
        type="text"
        placeholder="Search..."
        aria-label="Search TOTPs"
        bind:value={searchQuery}
        class="flex-1"
      />
      <div class="flex gap-2">
        <Select type="single" value={sortOption} onValueChange={handleSortChange}>
          <SelectTrigger class="w-[140px]">
            <span class="truncate">
              {sortOption === 'recent'
                ? 'Recently used'
                : sortOption === 'alphabetical'
                  ? 'Alphabetical'
                  : 'Created'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently used</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
            <SelectItem value="created">Created</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="flex gap-2">
      <Button variant="outline" size="sm" onclick={handleExportAll}>Export All</Button>
      <Button variant="outline" size="sm" onclick={() => fileInput?.click()}>Import</Button>
    </div>

    <Separator />

    {#if filteredRecords().length === 0}
      <div class="text-center py-8 text-muted-foreground">
        {#if searchQuery}
          No TOTPs match your search
        {:else}
          No saved TOTPs yet
        {/if}
      </div>
    {:else}
      <div class="space-y-2">
        {#each filteredRecords() as record (record.id)}
          <div class="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="font-medium truncate">{record.label || 'Unnamed TOTP'}</h3>
                  {#if record.passphraseHint}
                    <Badge variant="secondary" class="text-xs">Has hint</Badge>
                  {/if}
                </div>
                <p class="text-sm text-muted-foreground mt-1">
                  Created {formatRelativeTime(record.created)}
                </p>
                {#if record.savedWithAccount}
                  {@const account = getAccountForRecord(record)}
                  {#if account}
                    <p class="text-sm text-muted-foreground mt-1">
                      {isAccountUnlocked(account.id) ? '👤' : '🔒'}
                      {account.username}
                      {isAccountUnlocked(account.id) ? '(unlocked)' : '(locked)'}
                    </p>
                  {/if}
                {/if}
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <a
                  href={getViewUrl(record)}
                  class="inline-flex items-center justify-center h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  View
                </a>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="sm" aria-label="More actions">⋮</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onclick={() => handleExportUrl(record)}>
                      Export URL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      class="text-destructive"
                      onclick={() => {
                        confirmDelete(record);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </CardContent>
</Card>

<Dialog bind:open={deleteDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete TOTP?</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete "{recordToDelete?.label ?? 'Unnamed TOTP'}"? This action
        cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
      <Button variant="destructive" onclick={handleDelete}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
