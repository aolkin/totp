# Phase 4b: Account-Based Passphrase Storage

## Status: Not Started

## Prerequisites

**Phase 4a must be completed first.** This phase builds on the account management system to enable encrypted passphrase storage for TOTPs.

## Overview

Integrate the account system (from Phase 4a) with TOTP storage to enable automatic passphrase management. Users can save TOTP passphrases to unlocked accounts, eliminating the need to re-enter them.

**Key Principle:** This extends Phase 2's browser storage with optional passphrase encryption. Phase 1 stateless URLs and Phase 2 storage-without-accounts remain fully supported.

**Security Model:** TOTP passphrases are encrypted with the account's DEK (Data Encryption Key) established in Phase 4a.

## Architecture Changes

### Extended IndexedDB Schema

**New Object Store:**

```typescript
Database: "totp-storage" (existing)
Version: 4 (upgrade from Phase 4a's version 3)

Object Store: "encrypted_passphrases"
Key Path: "id" (auto-increment)
Indexes: ["accountId", "totpId"]

interface EncryptedPassphrase {
  id: number;
  accountId: number; // Foreign key to accounts
  totpId: number; // Foreign key to TOTPRecord from Phase 2
  encrypted: {
    iv: Uint8Array;
    ciphertext: Uint8Array;
    tag: Uint8Array;
  };
  created: number; // timestamp
}
```

**Phase 2 Schema Update:**

```typescript
// Extend TOTPRecord from Phase 2
interface TOTPRecord {
  id: number;
  label: string;
  created: number;
  lastUsed: number;
  encrypted: {
    salt: Uint8Array;
    iv: Uint8Array;
    ciphertext: Uint8Array;
    tag: Uint8Array;
  };
  passphraseHint?: string;
  savedWithAccount?: number; // NEW: optional account ID reference
}
```

## UI Changes

### Enhanced Create/Save Flow

**Phase 2 Behavior (Before Phase 4b):**

```
[✓] Save to this browser
```

**Phase 4b Behavior (After Implementation):**

```
Save options:
( ) Don't save
( ) Save TOTP to browser (passphrase required each time)
( ) Save TOTP and passphrase to account: [dropdown ▼]
    └─ Options:
       - alice@work (unlocked)
       - bob@personal (locked - click to unlock)
       - [+ Create new account...]
```

**Logic:**
1. If user selects "Don't save": Phase 1 stateless URL only
2. If "Save TOTP to browser": Phase 2 behavior (passphrase not saved)
3. If "Save TOTP and passphrase to account":
   - If account is locked, prompt to unlock first
   - Save both TOTP (to `secrets` store) and encrypted passphrase (to `encrypted_passphrases` store)
   - Set `savedWithAccount` field on TOTPRecord

**If "[+ Create new account...]" selected:**
- Open Create Account dialog (from Phase 4a)
- After creation, automatically select that account for saving

### Enhanced List View

**Phase 2 List Item:**

```
┌─────────────────────────────────────────┐
│  GitHub - work@example.com              │
│  Created: 2 days ago                    │
│  [View] [Export URL] [Delete]           │
└─────────────────────────────────────────┘
```

**Phase 4b List Item (with account):**

```
┌─────────────────────────────────────────┐
│  GitHub - work@example.com              │
│  Created: 2 days ago                    │
│  👤 alice@work (unlocked)               │
│  [View] [Export URL] [Delete]           │
└─────────────────────────────────────────┘
```

**If account is locked:**

```
┌─────────────────────────────────────────┐
│  GitHub - work@example.com              │
│  Created: 2 days ago                    │
│  🔒 alice@work (locked)                 │
│  [View] [Export URL] [Delete]           │
└─────────────────────────────────────────┘
```

**Click "View" Behavior:**

**Without Account (Phase 2):**
- Always prompt for passphrase

**With Account (Phase 4b):**
- If account is unlocked: Automatically decrypt passphrase and show TOTP (no prompt)
- If account is locked: Show unlock dialog, then auto-decrypt and show TOTP
- Update `lastActivity` timestamp for auto-lock (from Phase 4a)

### Account Management Dialog Updates

**Update from Phase 4a:**

```
┌─────────────────────────────────────────┐
│  Accounts                      [+ New]  │
├─────────────────────────────────────────┤
│  👤 alice@work                          │
│     Unlocked • 3 TOTPs saved            │
│     Auto-lock: 15 minutes               │
│     [Lock] [Edit] [Delete Account]      │
├─────────────────────────────────────────┤
│  👤 bob@personal                        │
│     🔒 Locked • 5 TOTPs saved           │
│     Auto-lock: Never                    │
│     [Unlock] [Edit] [Delete Account]    │
└─────────────────────────────────────────┘
```

**New:** Show count of TOTPs saved to each account ("3 TOTPs saved", "5 TOTPs saved")

### Delete Account Warning Update

**Phase 4a warning:**
```
Are you sure? This action is permanent.
```

**Phase 4b warning:**
```
This will delete 3 saved passphrases.
TOTPs will remain but require manual passphrase entry.

Are you sure?
```

## Encryption & Passphrase Management

### Passphrase Encryption (Using DEK from Phase 4a)

**Saving a passphrase to an account:**

```typescript
async function savePassphraseToAccount(
  accountId: number,
  totpId: number,
  passphrase: string
): Promise<void> {
  const account = unlockedAccounts.get(accountId);
  if (!account) {
    throw new Error('Account must be unlocked first');
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(passphrase);

  // Encrypt passphrase with DEK (from Phase 4a)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    account.dataEncryptionKey, // DEK from Phase 4a
    encoded
  );

  // Store in encrypted_passphrases object store
  await db.add('encrypted_passphrases', {
    accountId,
    totpId,
    encrypted: {
      iv,
      ciphertext: new Uint8Array(ciphertext.slice(0, -16)),
      tag: new Uint8Array(ciphertext.slice(-16))
    },
    created: Date.now()
  });
}
```

**Retrieving a passphrase:**

```typescript
async function getPassphraseFromAccount(
  accountId: number,
  totpId: number
): Promise<string | undefined> {
  const account = unlockedAccounts.get(accountId);
  if (!account) {
    return undefined; // Account locked
  }

  const record = await db.getByIndex(
    'encrypted_passphrases',
    'accountId_totpId',
    [accountId, totpId]
  );

  if (!record) return undefined;

  const { iv, ciphertext, tag } = record.encrypted;
  const combined = new Uint8Array([...ciphertext, ...tag]);

  // Decrypt passphrase with DEK
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    account.dataEncryptionKey, // DEK from Phase 4a
    combined
  );

  return new TextDecoder().decode(decrypted);
}
```

**Why This Works:**
- DEK from Phase 4a never changes, so all encrypted passphrases remain valid
- Password change (Phase 4a) only re-wraps DEK, passphrases don't need re-encryption
- Efficient O(1) password change regardless of number of TOTPs

## Features

### Save TOTP with Passphrase to Account

**Flow:**
1. User creates or imports TOTP
2. Selects "Save TOTP and passphrase to account"
3. Chooses account from dropdown (or creates new one)
4. If account locked, unlock dialog appears
5. TOTP saved to `secrets` store with `savedWithAccount` field
6. Passphrase encrypted with account's DEK and saved to `encrypted_passphrases` store

### View TOTP with Auto-Decrypt

**Flow:**
1. User clicks "View" on TOTP list item
2. Check if `savedWithAccount` field is set
3. If yes:
   - Check if account is unlocked
   - If unlocked: decrypt passphrase automatically, show TOTP
   - If locked: show unlock dialog, then decrypt and show TOTP
4. If no: prompt for passphrase manually (Phase 2 behavior)

### Retroactive Passphrase Save

**Enable users to save passphrases for existing TOTPs:**

1. User views TOTP (enters passphrase manually)
2. TOTP view shows button: "Save passphrase to account"
3. Click shows account selection dropdown
4. Select account (or create new)
5. Passphrase encrypted and saved, `savedWithAccount` updated

### Delete Account with Passphrases

**Extended from Phase 4a:**

1. Show confirmation with count: "This will delete 3 saved passphrases. TOTPs will remain but require manual passphrase entry."
2. User confirms
3. Delete Account record
4. Delete all EncryptedPassphrase records with matching accountId
5. Update all TOTPRecords: clear `savedWithAccount` field
6. Remove from unlockedAccounts if unlocked

### Activity Tracking Update

**Extend Phase 4a activity events:**

- Unlocking the account
- Any user interaction with account-related UI
- **NEW:** Viewing a TOTP with account passphrase
- **NEW:** Saving a new TOTP to the account

## Migration & Compatibility

### Phase 1 Compatibility
- Stateless URLs continue to work identically
- No changes to URL fragment format

### Phase 2 Compatibility
- Existing Phase 2 saved TOTPs work unchanged
- Can retroactively add passphrase to account using "Save passphrase to account" feature

### Phase 4a Compatibility
- All account management features from Phase 4a work unchanged
- Accounts created in Phase 4a are ready to use immediately

### Upgrade Path
- IndexedDB schema upgrade from version 3 to 4
- Adds `encrypted_passphrases` object store
- Adds `savedWithAccount` field to existing TOTPRecord entries (defaults to undefined)
- No data migration needed for existing TOTPs

## Testing Requirements

Use **Vitest** for unit tests and **Playwright** for E2E tests.

### tests/passphrase-storage.spec.ts

- Save TOTP with passphrase to account
- Retrieve passphrase from unlocked account
- Cannot retrieve passphrase from locked account
- Delete account removes all associated passphrases
- Passphrase encryption/decryption round-trip with DEK
- Multiple TOTPs can use same account

### tests/ui-totp-account-integration.spec.ts

- Create TOTP with "save to account" option
- View TOTP with account passphrase (auto-decrypt when unlocked)
- View TOTP without account (prompt for passphrase)
- View TOTP with locked account (unlock prompt, then auto-decrypt)
- Retroactively save passphrase to account
- List view shows account association correctly
- Account unlock state indicator (🔒 vs unlocked)

### tests/account-delete-with-passphrases.spec.ts

- Delete account with saved passphrases
- Confirmation shows correct count
- TOTPs remain but `savedWithAccount` cleared
- Encrypted passphrases deleted
- Viewing TOTP after account deletion prompts for passphrase

### tests/passphrase-migration.spec.ts

- Retroactive save: view Phase 2 TOTP, save passphrase to account
- Next view auto-decrypts with account
- Works with multiple accounts
- Works after account password change

### tests/create-flow-integration.spec.ts

- Create TOTP with account selection dropdown
- Select unlocked account
- Select locked account (unlock prompt appears)
- Create new account from dropdown
- Account selection persists across form resets

### tests/account-indexeddb-integration.spec.ts

- EncryptedPassphrase CRUD operations
- IndexedDB indexes work correctly (accountId, totpId, composite)
- Schema migration from version 3 to 4
- Foreign key relationships maintained
- Orphaned passphrases cleaned up on account delete

## Implementation Notes

### Database Migration

```typescript
// Upgrade from Phase 4a (version 3) to Phase 4b (version 4)
const request = indexedDB.open('totp-storage', 4);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const oldVersion = event.oldVersion;

  if (oldVersion < 4) {
    // Create encrypted_passphrases object store
    const passphrasesStore = db.createObjectStore('encrypted_passphrases', {
      keyPath: 'id',
      autoIncrement: true
    });
    passphrasesStore.createIndex('accountId', 'accountId', { unique: false });
    passphrasesStore.createIndex('totpId', 'totpId', { unique: false });
    passphrasesStore.createIndex('accountId_totpId', ['accountId', 'totpId'], { unique: true });
  }
};
```

### TOTP Count per Account

```typescript
async function getTOTPCountForAccount(accountId: number): Promise<number> {
  const passphrases = await db.getAllFromIndex(
    'encrypted_passphrases',
    'accountId',
    accountId
  );
  return passphrases.length;
}
```

### Auto-Decrypt Logic

```typescript
async function viewTOTP(totpRecord: TOTPRecord): Promise<string> {
  let passphrase: string | undefined;

  if (totpRecord.savedWithAccount) {
    // Try to get passphrase from account
    passphrase = await getPassphraseFromAccount(
      totpRecord.savedWithAccount,
      totpRecord.id
    );

    if (!passphrase) {
      // Account locked or passphrase not found
      const account = await db.get('accounts', totpRecord.savedWithAccount);
      if (account) {
        // Account exists but is locked
        await showUnlockDialog(account);
        passphrase = await getPassphraseFromAccount(
          totpRecord.savedWithAccount,
          totpRecord.id
        );
      }
    }
  }

  if (!passphrase) {
    // Fall back to manual entry
    passphrase = await showPassphrasePrompt(totpRecord.label);
  }

  // Decrypt TOTP config with passphrase
  const config = await decryptTOTPConfig(totpRecord.encrypted, passphrase);
  return generateTOTP(config);
}
```

### Error Handling

**Passphrase Operations:**
- Cannot decrypt → Account may be locked, prompt to unlock
- Passphrase not found → Fall back to manual entry
- Encryption error → Show error, allow manual passphrase entry
- Account deleted but passphrase reference exists → Clear reference, prompt manually

## Success Criteria

Phase 4b is complete when:

- [ ] Can save TOTPs with passphrases to accounts (encrypted with DEK)
- [ ] Viewing TOTP with account passphrase auto-decrypts when unlocked
- [ ] Viewing TOTP with locked account shows unlock prompt, then auto-decrypts
- [ ] Can retroactively save passphrase to account for existing TOTPs
- [ ] Enhanced create/save flow with account dropdown
- [ ] List view shows account association and lock state
- [ ] Account count shows number of TOTPs saved to each account
- [ ] Delete account removes passphrases and updates TOTP records
- [ ] Delete account warning shows correct TOTP count
- [ ] Activity tracking updates on TOTP view and save
- [ ] Phase 1, Phase 2, and Phase 4a functionality unchanged
- [ ] All code is checked for duplication and refactoring is done
- [ ] All unnecessary comments are removed
- [ ] All tests pass
- [ ] Documentation updated (README if user-facing changes)
