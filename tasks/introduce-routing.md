# Introduce SvelteKit Hash Routing

## Status: Planning 📋

## Overview

Migrate from plain Vite + Svelte to SvelteKit with hash-based routing. This provides file-based routing, better code organization, and long-term maintainability backed by the official Svelte team.

**Key Principle:** Use SvelteKit's native hash router (`router: { type: 'hash' }`) to maintain PWA-friendly client-side routing without requiring server configuration.

**Breaking Change:** Existing URLs will change format. Old encrypted-data-only URLs will no longer work.

## URL Structure Changes

### Current (Breaking)
```
https://example.com/#<encrypted-data>
```

### New Structure
```
/#/                      → List view (TotpList)
/#/create                → Create form (CreateForm)
/#/view/<encrypted-data> → TOTP display (TotpDisplay)
```

**Note:** Settings remains an overlay (gear icon toggle), not a dedicated route.

## Project Structure Changes

### Before (Vite + Svelte)
```
src/
├── App.svelte           # Main component with mode state machine
├── main.ts              # Entry point
├── app.css              # Global styles
├── components/          # All components flat
│   ├── CreateForm.svelte
│   ├── TotpList.svelte
│   ├── TotpDisplay.svelte
│   ├── PassphrasePrompt.svelte
│   └── ...
├── lib/                 # Utilities and logic
│   ├── crypto.ts
│   ├── storage.ts
│   └── ...
└── service-worker.ts
```

### After (SvelteKit)
```
src/
├── routes/
│   ├── +layout.svelte   # Shared layout (header, settings overlay, banners)
│   ├── +page.svelte     # List view (/)
│   ├── create/
│   │   └── +page.svelte # Create form (/create)
│   └── view/
│       └── [data]/
│           └── +page.svelte # TOTP display (/view/[data])
├── lib/                 # Unchanged - utilities stay here
│   ├── components/      # Reusable components (UI, PassphrasePrompt, etc.)
│   ├── crypto.ts
│   ├── storage.ts
│   └── ...
├── app.html             # HTML template
├── app.css              # Global styles
└── service-worker.ts    # PWA service worker
```

## Configuration Changes

### New: svelte.config.js
```javascript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'site',
      assets: 'site',
      fallback: 'index.html'
    }),
    router: {
      type: 'hash'
    },
    paths: {
      base: ''
    }
  }
};

export default config;
```

### Update: vite.config.ts
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    VitePWA({
      // Existing PWA config - may need minor adjustments
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      // ...
    })
  ]
});
```

### Update: package.json
```json
{
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.0",
    "@sveltejs/kit": "^2.0.0",
    // Remove: "vite" (SvelteKit includes it)
    // Keep other deps unchanged
  }
}
```

## Migration Steps

### 1. Install SvelteKit Dependencies
```bash
npm install -D @sveltejs/kit @sveltejs/adapter-static
```

### 2. Create SvelteKit Configuration
- Create `svelte.config.js` with hash router and static adapter
- Update `vite.config.ts` to use `sveltekit()` plugin

### 3. Create Route Structure
- Create `src/routes/` directory
- Move/adapt components to route pages:
  - `+layout.svelte` - Extract shared UI from App.svelte (header, settings, banners)
  - `+page.svelte` - TotpList component logic
  - `create/+page.svelte` - CreateForm component logic
  - `view/[data]/+page.svelte` - TotpDisplay with PassphrasePrompt logic

### 4. Update Navigation
- Replace `window.location.hash = ''` with SvelteKit's `goto('/')`
- Replace manual hash parsing with `$page.params.data`
- Update all internal links to use `href="#/create"` format
- Remove callback props like `onCreateNew`, `onBack`, etc. - components can use `goto()` directly

### 5. Handle Encrypted Data Parameter
The `view/[data]/+page.svelte` route receives encrypted data via `$page.params.data`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { decodeFromURL } from '$lib/crypto';

  let data = $derived($page.params.data);
  let encryptedData = $derived(data ? decodeFromURL(data) : undefined);
</script>
```

### 6. Move Shared Components
- Move reusable components to `src/lib/components/`
- PassphrasePrompt, QrScanner, OfflineBanner, UpdateBanner, CacheInfo, etc.

### 7. Update PWA Configuration
- Verify service worker still builds correctly
- Test offline functionality
- Update any hardcoded paths if necessary

### 8. Update Build Scripts
- Verify `npm run build` outputs to `site/`
- Verify `npm run dev` works with hash routing
- Verify `npm run preview` serves correctly

### 9. Delete Obsolete Files
- Remove `src/App.svelte` (logic distributed to routes)
- Remove `src/main.ts` (SvelteKit handles entry point)
- Remove `index.html` from root (replaced by `src/app.html`)

## Component Mapping

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `App.svelte` | `routes/+layout.svelte` | Shared layout, settings overlay |
| `App.svelte` (list mode) | `routes/+page.svelte` | List view |
| `App.svelte` (create mode) | `routes/create/+page.svelte` | Create form |
| `App.svelte` (display/prompt/error) | `routes/view/[data]/+page.svelte` | View with passphrase handling |
| `components/CreateForm.svelte` | `lib/components/CreateForm.svelte` or inline | May inline into route |
| `components/TotpList.svelte` | `lib/components/TotpList.svelte` or inline | May inline into route |
| `components/TotpDisplay.svelte` | `lib/components/TotpDisplay.svelte` | Keep as component |
| `components/PassphrasePrompt.svelte` | `lib/components/PassphrasePrompt.svelte` | Keep as component |
| `components/QrScanner.svelte` | `lib/components/QrScanner.svelte` | Keep as component |
| Other components | `lib/components/` | Keep as components |

## Navigation Patterns

### Programmatic Navigation
```typescript
import { goto } from '$app/navigation';

// Navigate to create
goto('#/create');

// Navigate to view with encrypted data
goto(`#/view/${encodeURIComponent(encodedData)}`);

// Navigate back to list
goto('#/');
```

### Link Navigation
```svelte
<a href="#/create">Add New</a>
<a href="#/">Back to List</a>
<a href="#/view/{encodedData}">View TOTP</a>
```

### From Storage Records
When clicking a saved TOTP from the list:
```typescript
async function viewRecord(record: TOTPRecord) {
  const encoded = encodeToURL(record.encrypted);
  goto(`/view/${encodeURIComponent(encoded)}`);
}
```

## Testing Requirements

### Update Existing E2E Tests

All existing Playwright tests need updates for new URL structure:

#### tests/e2e.spec.ts
- Update navigation assertions to expect `/#/` paths
- Update URL checks from `#<data>` to `#/view/<data>`
- Verify list view loads at `/#/`
- Verify create form at `/#/create`

#### tests/ui-create.spec.ts
- Navigate to `/#/create` instead of checking mode
- Update "back to list" assertions
- Verify URL changes after form submission

#### tests/ui-view.spec.ts
- Update URL format expectations
- Test navigation from list to view route
- Test back navigation to list

#### tests/qr-scan.spec.ts
- Ensure QR scanner works within new route structure
- Test that scanned data navigates correctly

#### tests/dark-mode.spec.ts
- Verify dark mode works across all routes
- Test layout-level dark mode consistency

## Error Handling

### Invalid Route
```svelte
<!-- routes/+error.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    // Redirect unknown routes to list after brief delay
    setTimeout(() => goto('/'), 2000);
  });
</script>

<div class="error">
  <p>Page not found. Redirecting to home...</p>
</div>
```

### Invalid Encrypted Data
Handle in `view/[data]/+page.svelte`:
- Show error message if decoding fails
- Provide "Back to List" button
- Don't crash the app

## Success Criteria

This task is complete when:

- [ ] SvelteKit installed and configured with hash routing
- [ ] All routes work: `/`, `/create`, `/view/[data]`
- [ ] File-based routing structure in place
- [ ] Shared layout with header, settings overlay, banners
- [ ] All existing functionality preserved (create, view, list, QR scan, export/import)
- [ ] PWA still works (offline, install, update prompts)
- [ ] Service worker builds and caches correctly
- [ ] All E2E tests updated and passing
- [ ] Build outputs to `site/` for GitHub Pages
- [ ] No TypeScript errors (`npm run check` passes)
- [ ] Linting passes (`npm run lint`)
- [ ] Old `App.svelte` and `main.ts` removed

## Rollback Plan

If issues arise during migration:
1. The migration is atomic - either fully complete or revert
2. Keep a backup branch before starting
3. Git history preserves the pre-SvelteKit state

## Future Considerations

Once routing is in place, adding new routes becomes trivial:
- `/#/settings` - If settings needs its own page later
- `/#/import` - Dedicated import workflow
- `/#/about` - About/help page
- `/#/edit/[id]` - Edit saved TOTP metadata
