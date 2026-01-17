# Phase 2: IndexedDB Persistence

## Overview

Add local browser storage to Phase 1, allowing users to save TOTP configurations and access them from the root domain without needing to bookmark individual URLs.

**Key Principle:** Encrypted URLs remain stateless and shareable. Storage is an optional convenience feature for personal use.

**UI Framework:** Continue using Tailwind CSS and shadcn-svelte components established in Phase 1 for consistent styling and user experience.

## Architecture Changes

### Dual Mode Operation

**Stateless Mode (Phase 1):**

- URL with fragment → Direct TOTP view
- No storage involved

**Persistent Mode (Phase 2):**

- Root domain → Saved TOTPs list
- Click TOTP → Decrypt and view
- TOTPs stored encrypted in IndexedDB

### Storage Design

**IndexedDB Schema:**

```typescript
Database: "totp-storage"
Version: 1

Object Store: "secrets"
Key Path: "id" (auto-increment)

// TypeScript interface
interface TOTPRecord {
  id: number;
  label: string;
  created: number;  // timestamp
  lastUsed: number; // timestamp
  encrypted: {
    salt: Uint8Array;
    iv: Uint8Array;
    ciphertext: Uint8Array;
    tag: Uint8Array;
  };
  passphraseHint?: string; // optional, stored plaintext
}
```

**Encryption:** Same as Phase 1 (AES-256-GCM with PBKDF2-derived key)

**Important:** Each TOTP can have its own passphrase. Passphrase is NOT stored, only used to encrypt/decrypt.

## UI Changes

### Root Domain View (List Mode)

**When accessing root without fragment:**

1. Check if IndexedDB has saved TOTPs
2. If empty: Show create form (Phase 1 behavior)
3. If has TOTPs: Show list view with "Add New" button

**List View Layout:**

```
┌─────────────────────────────────────┐
│  Saved TOTPs              [+ Add]   │
├─────────────────────────────────────┤
│  GitHub - work@example.com          │
│  Created: 2 days ago                │
│  [View] [Export URL] [Delete]       │
├─────────────────────────────────────┤
│  AWS Console - prod                 │
│  Created: 1 week ago                │
│  [View] [Export URL] [Delete]       │
└─────────────────────────────────────┘
```

**Actions:**

- **View:** Prompt for passphrase → Show TOTP code
- **Export URL:** Generate stateless URL (Phase 1 format) and copy
- **Delete:** Confirm modal → Remove from IndexedDB
- **Add:** Show create form

### Create Form Enhancements

**Add checkbox:**

- [ ] Save to this browser (optional)

**If checked:**

- Show passphrase requirement warning
- Passphrase required (cannot be empty for saved TOTPs)
- Optional "Passphrase Hint" field (stored plaintext)

**On submit:**

- If "Save to browser" checked: Store in IndexedDB AND generate URL
- If unchecked: Only generate URL (Phase 1 behavior)

### View Mode (from List)

**Passphrase Prompt:**

- "Enter passphrase for [Label]"
- Optional hint displayed: "Hint: office-door-code"
- Remember passphrase in session (sessionStorage) to avoid re-entering
- "Forget passphrase" button to clear session

**TOTP Display:**

- Same as Phase 1 (large code, countdown, auto-refresh)
- Add "Back to List" button
- Add "Export URL" button (generates shareable URL)
- Update lastUsed timestamp

## Features

### Export as Shareable URL

**From list or view mode:**

```typescript
async function exportAsURL(record: TOTPRecord): Promise<void> {
  // Re-encrypt with same passphrase into URL format
  const url = await generateStatelessURL(record);
  copyToClipboard(url);
  showToast('Shareable URL copied!');
}
```

This allows transitioning stored TOTP to stateless URL for sharing with team.

### Bulk Operations

**List view actions:**

- **Export All:** Download JSON file of all encrypted records
- **Import:** Upload JSON file to restore (confirm before overwriting)

**Export format (encrypted, shareable):**

```json
{
  "version": 1,
  "exported": 1704067200000,
  "totps": [
    {
      "label": "GitHub",
      "encrypted": {...},
      "passphraseHint": "..."
    }
  ]
}
```

### Search/Filter

**Search bar above list:**

- Filter by label (client-side, case-insensitive)
- Update list dynamically as user types

### Sorting

**Dropdown options:**

- Recently used (default)
- Alphabetical
- Creation date

## Security Considerations

### Passphrase Management

**Session caching:**

- Store decrypted passphrases in sessionStorage
- Clear on browser close or manual "Forget"
- Never persist to localStorage

**Master password option:**

- add "Save passphrases with master password" feature
- Enables persisting passphrases locally in separate database encrypted with the chosen password
- chosen password is kept in memory for encryption and decryption but never persisted. if the passphrases database is present, the user is prompted to enter it on page load but can skip if desired. as a result, the passphrase database can be locked by closing the tab.

### Privacy

**No cloud sync:**

- IndexedDB is local to browser/device
- No automatic sync across devices
- User must manually export/import

**Browser clearing:**

- Warn users: "Clearing browser data will delete all saved TOTPs"
- Recommend periodic backups via export

## Migration from Phase 1

**Backwards compatible:**

- Phase 1 URLs still work exactly the same
- Phase 2 only adds storage option
- No breaking changes

**Upgrade path:**

- Existing Phase 1 users: Add TOTPs to storage by opening URL and clicking "Save to browser"

## Testing Requirements

### tests/indexeddb.spec.ts

- Test database creation and schema
- Test CRUD operations (create, read, update, delete)
- Test encryption/decryption with IndexedDB storage
- Test quota handling (what if storage full?)

### tests/ui-list.spec.ts

- Display empty state → Show create form
- Display list with multiple TOTPs
- Test search/filter functionality
- Test sorting options
- Test delete confirmation

### tests/ui-save.spec.ts

- Create with "Save to browser" → Verify in list
- Create without save → Only URL generated
- Test passphrase requirement when saving
- Test passphrase hint storage

### tests/export-import.spec.ts

- Export single TOTP as URL → Verify matches Phase 1 format
- Export all as JSON → Verify structure
- Import JSON → Verify TOTPs restored
- Test import with conflicts (same label)

### tests/session.spec.ts

- Enter passphrase → View TOTP → Navigate away → Return → No re-prompt
- Test "Forget passphrase" clears session
- Test sessionStorage cleared on browser close

### tests/masterpassword.spec.ts

- Tests appropriate to the master password functionality.

## Implementation Notes

### IndexedDB Wrapper

Create abstraction layer:

```typescript
class TOTPStorage {
  private db: IDBDatabase | undefined;

  async init(): Promise<void> {
    /* Open database */
  }
  async add(totp: Omit<TOTPRecord, 'id'>): Promise<number> {
    /* Add record */
  }
  async getAll(): Promise<TOTPRecord[]> {
    /* List all */
  }
  async getById(id: number): Promise<TOTPRecord | undefined> {
    /* Get one */
  }
  async update(id: number, data: Partial<TOTPRecord>): Promise<void> {
    /* Update */
  }
  async delete(id: number): Promise<void> {
    /* Remove */
  }
  async search(query: string): Promise<TOTPRecord[]> {
    /* Filter */
  }
}
```

### Error Handling

- Database quota exceeded → Show warning, suggest export
- Corruption → Offer to reset database
- Browser doesn't support IndexedDB → Graceful degradation to Phase 1 only

## Success Criteria

Phase 2 is complete when:

- [ ] Can save TOTPs to IndexedDB
- [ ] List view displays all saved TOTPs
- [ ] Can view saved TOTPs with passphrase
- [ ] Can export saved TOTPs as shareable URLs
- [ ] Can delete saved TOTPs
- [ ] Search and sorting work
- [ ] Export/import JSON backup works
- [ ] All code is checked for duplication and refactoring is done to ensure no duplication exists
- [ ] All unnecessary comments are removed, code should be self-documenting
- [ ] All tests pass
- [ ] Phase 1 URLs still work (backwards compatible)
