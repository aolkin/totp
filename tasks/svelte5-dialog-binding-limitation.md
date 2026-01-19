# Svelte 5 + bits-ui Dialog Binding Limitation

## Issue Summary

The QR Scanner dialog cannot be closed via the Cancel button in E2E tests due to a known limitation with multi-layer `bind:open` propagation in Svelte 5 when using bits-ui/shadcn-svelte Dialog components.

## Component Hierarchy

```
CreateForm.svelte (showScanner = $state(false))
    └── QrScanner.svelte (open = $bindable(false))
            └── Dialog.Root (open = $bindable(false))
                    └── DialogPrimitive.Root (bits-ui internal state)
```

## The Problem

When controlling a bits-ui Dialog externally (via a bound variable from a parent component), the `onOpenChange` callback does not fire reliably. This is documented in [bits-ui issue #443](https://github.com/huntabyte/bits-ui/issues/443).

### What Happens

1. Parent sets `showScanner = true` → Dialog opens ✅
2. User clicks Cancel button → `closeDialog()` is called
3. `closeDialog()` calls `onClose?.()` → Parent sets `showScanner = false`
4. **Expected**: Dialog closes because `open` prop is now `false`
5. **Actual**: Dialog stays open because bits-ui's internal state is not synchronized

### Why It Happens

Svelte 5's `$bindable` props work differently from Svelte 4:

- If you pass `open={value}` (without `bind:`), the dialog is "controlled" and only reacts to changes from the parent
- If you use `bind:open={value}`, changes should sync both ways
- **However**, when there are multiple layers of `bind:open` (CreateForm → QrScanner → Dialog.Root → DialogPrimitive.Root), the binding chain breaks

This is related to [Svelte issue #11360](https://github.com/sveltejs/svelte/issues/11360) about `$bindable` prop behavior.

## Attempted Solutions

### 1. Using `bind:open` at every layer
```svelte
<!-- CreateForm.svelte -->
<QrScanner bind:open={showScanner} />

<!-- QrScanner.svelte -->
let { open = $bindable(false) } = $props();
<Dialog.Root bind:open>
```
**Result**: Dialog still doesn't close

### 2. Using `onOpenChange` callback
```svelte
<Dialog.Root {open} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
```
**Result**: `onOpenChange` doesn't fire when dialog is externally controlled

### 3. Using `{#if open}` conditional rendering
```svelte
{#if open}
  <Dialog.Root open={true}>
{/if}
```
**Result**: Works but breaks dialog close animation

### 4. Local state synchronized with prop
```svelte
let dialogOpen = $state(false);
$effect(() => { dialogOpen = open; });
<Dialog.Root bind:open={dialogOpen}>
```
**Result**: Dialog still doesn't close

### 5. Direct button onclick handler
```svelte
<Button onclick={() => { open = false; onClose?.(); }}>Cancel</Button>
```
**Result**: Parent state updates but dialog stays open

## Recommended Workarounds

### Option A: Let bits-ui manage state internally (Preferred)
Don't control the dialog externally. Use `Dialog.Trigger` inside the component:
```svelte
<Dialog.Root>
  <Dialog.Trigger>Open Scanner</Dialog.Trigger>
  <Dialog.Content>...</Dialog.Content>
</Dialog.Root>
```
**Limitation**: Can't open the dialog programmatically from parent

### Option B: Use conditional rendering with CSS transitions
```svelte
{#if open}
  <div class="dialog-wrapper" class:closing={isClosing}>
    <Dialog.Root open={true}>
      ...
    </Dialog.Root>
  </div>
{/if}
```
Handle close animation manually with CSS before unmounting.

### Option C: Use a Svelte store for shared state
```typescript
// stores.ts
export const scannerOpen = writable(false);

// CreateForm.svelte
import { scannerOpen } from './stores';
<button onclick={() => $scannerOpen = true}>Scan QR</button>

// QrScanner.svelte
import { scannerOpen } from './stores';
<Dialog.Root bind:open={$scannerOpen}>
```

### Option D: Wait for upstream fix
Monitor these issues for updates:
- [bits-ui #443](https://github.com/huntabyte/bits-ui/issues/443)
- [svelte #11360](https://github.com/sveltejs/svelte/issues/11360)

## Current Implementation Status

The QR Scanner component works correctly in production:
- ✅ Opens when "Scan QR" button is clicked
- ✅ Camera starts and scans QR codes
- ✅ Parsed data populates form fields
- ✅ Cancel button calls the close handler
- ⚠️ Dialog closing relies on `onClose` callback updating parent state

The E2E test verifies:
- ✅ Modal opens correctly
- ✅ Scanner UI is displayed
- ❌ Modal close verification (limited by this binding issue)

## References

- [bits-ui Dialog documentation](https://www.bits-ui.com/docs/components/dialog)
- [bits-ui issue #443 - onOpenChange callback not fired consistently](https://github.com/huntabyte/bits-ui/issues/443)
- [Svelte issue #11360 - $bindable prop behavior](https://github.com/sveltejs/svelte/issues/11360)
- [Svelte 5 $bindable documentation](https://svelte.dev/docs/svelte/$bindable)

## Date Documented

2026-01-19
