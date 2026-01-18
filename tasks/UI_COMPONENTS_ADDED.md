# UI Components Added for Phases 2 & 3

**Date:** January 18, 2026

## Summary

All necessary shadcn-svelte UI components for implementing Phase 2 (IndexedDB Persistence) and Phase 3 (QR Code Scanning) have been added to the project using the shadcn-svelte CLI.

## Components Added

### Phase 2 Components

1. **checkbox** (`src/lib/components/ui/checkbox/`)
   - Purpose: "Save to browser" option in create form
   - Usage: Toggle for enabling IndexedDB storage

2. **select** (`src/lib/components/ui/select/`)
   - Purpose: Sorting dropdown in list view
   - Options: Recently used, Alphabetical, Creation date

3. **separator** (`src/lib/components/ui/separator/`)
   - Purpose: Visual divider between TOTP list items
   - Usage: Improve readability in list view

4. **badge** (`src/lib/components/ui/badge/`)
   - Purpose: Display tags, hints, and labels
   - Usage: Passphrase hints, creation dates, status indicators

5. **alert** (`src/lib/components/ui/alert/`)
   - Purpose: Warning messages and informational notices
   - Usage: Storage quota warnings, permission errors, validation messages

6. **sonner** (`src/lib/components/ui/sonner/`)
   - Purpose: Toast notifications
   - Usage: Success messages ("URL copied!", "TOTP saved"), error alerts
   - Note: Adds `svelte-sonner` dependency

7. **dropdown-menu** (`src/lib/components/ui/dropdown-menu/`)
   - Purpose: Action menus for each TOTP item
   - Actions: View, Export URL, Delete

### Phase 3 Components

8. **switch** (`src/lib/components/ui/switch/`)
   - Purpose: Toggle between front/rear camera on mobile devices
   - Usage: Camera selection in QR scanning modal

### Previously Existing Components (Phase 1)

The following components were already available and will be reused:

- **button** - Primary actions, form submissions
- **card** - Container for TOTP display and list items
- **dialog** - Modal dialogs for confirmations and camera preview
- **input** - Text inputs for secrets, labels, passphrases
- **label** - Form field labels
- **progress** - TOTP countdown timer

## New Dependencies

The component installation added the following dependencies to `package.json`:

1. **mode-watcher** (^1.1.0)
   - Purpose: Theme/mode management
   - Used by: Various UI components for dark/light mode support

2. **svelte-sonner** (^1.0.7)
   - Purpose: Toast notification system
   - Used by: sonner component

## Type Definitions

Added `WithoutChild<T>` type to `src/lib/utils.ts` to support the new components:

```typescript
export type WithoutChild<T> = Omit<T, 'child'>;
```

This type is used by select and dropdown-menu components to properly type their props.

## Fixes Applied

1. **Type Export**: Added missing `WithoutChild` type export in `src/lib/utils.ts`
2. **Linting**: Fixed nullish coalescing operator usage in `select-item.svelte` (changed `||` to `??`)

## Verification

All components have been verified to:
- ✅ Build successfully (`npm run build`)
- ✅ Pass type checking (`npm run check`)
- ✅ Pass linting (`npm run lint`)
- ✅ Pass unit tests (`npm run test:unit`)

## Next Steps

Implementation of Phase 2 and Phase 3 can now proceed using these components. Refer to:
- `/tasks/phase-2.md` for IndexedDB Persistence requirements
- `/tasks/phase-3.md` for QR Code Scanning requirements

## Component Locations

All UI components are located in: `src/lib/components/ui/`

```
src/lib/components/ui/
├── alert/
├── badge/
├── button/
├── card/
├── checkbox/
├── dialog/
├── dropdown-menu/
├── input/
├── label/
├── progress/
├── select/
├── separator/
├── sonner/
└── switch/
```

## Usage Examples

Each component directory contains a Svelte component file with TypeScript props and proper typing. Components follow the shadcn-svelte patterns and can be imported as:

```typescript
import { Button } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Select } from '$lib/components/ui/select';
import { Badge } from '$lib/components/ui/badge';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { toast } from 'svelte-sonner';
// etc.
```

For detailed component API and usage, refer to the [shadcn-svelte documentation](https://www.shadcn-svelte.com/).
