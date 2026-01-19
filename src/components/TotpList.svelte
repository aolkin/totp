<script lang="ts">
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
  import type { TOTPRecord, SortOption, TOTPExport } from '$lib/types';
  import { totpStorage } from '$lib/storage';
  import { encodeToURL } from '$lib/crypto';
  import { toast } from 'svelte-sonner';

  interface Props {
    onView: (record: TOTPRecord) => void;
    onAdd: () => void;
  }

  const { onView, onAdd }: Props = $props();

  let records = $state<TOTPRecord[]>([]);
  let searchQuery = $state('');
  let sortOption = $state<SortOption>('recent');
  let deleteDialogOpen = $state(false);
  let recordToDelete = $state<TOTPRecord | undefined>(undefined);
  let fileInput: HTMLInputElement | undefined;

  const filteredRecords = $derived(() => {
    let result = records;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) => r.label.toLowerCase().includes(query));
    }

    switch (sortOption) {
      case 'recent':
        return result.sort((a, b) => b.lastUsed - a.lastUsed);
      case 'alphabetical':
        return result.sort((a, b) => a.label.localeCompare(b.label));
      case 'created':
        return result.sort((a, b) => b.created - a.created);
      default:
        return result;
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

  function handleView(record: TOTPRecord) {
    onView(record);
  }

  async function handleExportUrl(record: TOTPRecord) {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${encodeToURL(record.encrypted)}`;
      await navigator.clipboard.writeText(url);
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

  function handleImportClick() {
    fileInput?.click();
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
      <Button onclick={onAdd}>+ Add New</Button>
    </div>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="flex gap-2 flex-col sm:flex-row">
      <Input type="text" placeholder="Search..." bind:value={searchQuery} class="flex-1" />
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
      <Button variant="outline" size="sm" onclick={handleImportClick}>Import</Button>
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
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onclick={() => {
                    handleView(record);
                  }}>View</Button
                >
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="sm">⋮</Button>
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
