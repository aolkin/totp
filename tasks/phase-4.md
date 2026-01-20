# Phase 4: Account System for Passphrase Management

## Status: Not Started

## Overview

Add an optional account system that extends Phase 2's browser storage by allowing users to save TOTP passphrases encrypted with account-specific keys. This eliminates the need to re-enter passphrases for frequently-used TOTPs while maintaining strong security through account-level encryption.

**Key Principle:** Accounts are a convenience feature for managing passphrases, not a replacement for the stateless URL architecture. Phase 1 stateless mode and Phase 2 storage-without-accounts remain fully supported.

**Security Model:** Each account encrypts passphrases with a key derived from its password. Accounts unlock in-memory only, never persisting unlocked state to disk.

## Architecture Changes

### Account Storage Design

**IndexedDB Schema (New Object Store):**

```typescript
Database: "totp-storage" (existing)
Version: 2 (upgrade from Phase 2)

Object Store: "accounts"
Key Path: "id" (auto-increment)

interface Account {
  id: number;
  username: string;
  created: number; // timestamp
  lastUsed: number; // timestamp
  passwordHash: string; // For login verification, not encryption
  salt: Uint8Array; // For password hashing
  keySalt: Uint8Array; // Separate salt for key derivation
}

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

### In-Memory Session Management

**Unlocked Accounts Store:**

```typescript
// In-memory only, never persisted
interface UnlockedAccount {
  accountId: number;
  username: string;
  encryptionKey: CryptoKey; // Derived from password
  unlockedAt: number; // timestamp
  lastActivity: number; // timestamp for auto-lock
}

// Svelte store (reactive)
const unlockedAccounts = $state<Map<number, UnlockedAccount>>(new Map());
```

**Auto-Lock Configuration:**

```typescript
interface AutoLockSettings {
  enabled: boolean;
  timeoutMinutes: number; // User-configurable, default: 15
}

// Stored in localStorage (not security-sensitive)
const autoLockSettings = $state<AutoLockSettings>({
  enabled: true,
  timeoutMinutes: 15
});
```

## UI Changes

### Account Management Dialog

**Trigger:** "Manage Accounts" button in settings or main menu

**Dialog Layout:**

```
┌─────────────────────────────────────────┐
│  Accounts                      [+ New]  │
├─────────────────────────────────────────┤
│  👤 alice@work                          │
│     Unlocked • 3 TOTPs saved            │
│     [Lock] [Delete Account]             │
├─────────────────────────────────────────┤
│  👤 bob@personal                        │
│     🔒 Locked • 5 TOTPs saved           │
│     [Unlock] [Delete Account]           │
└─────────────────────────────────────────┘

⚙️ Auto-lock after [15] minutes of inactivity
   [✓] Enable auto-lock
```

**Create Account Dialog:**

```
┌─────────────────────────────────────────┐
│  Create Account                    [×]  │
├─────────────────────────────────────────┤
│  Username (for identification):         │
│  [________________________]             │
│                                         │
│  Password:                              │
│  [________________________]             │
│                                         │
│  Confirm Password:                      │
│  [________________________]             │
│                                         │
│  ⚠️  Important:                         │
│  • Passwords cannot be recovered        │
│  • Each account encrypts independently  │
│  • Deleting an account is permanent     │
│                                         │
│           [Cancel] [Create Account]     │
└─────────────────────────────────────────┘
```

**Requirements:**
- Username: Any non-empty string (for user's reference only)
- Password: Minimum 8 characters
- Password confirmation must match
- No duplicate usernames within the same browser

**Unlock Account Dialog:**

```
┌─────────────────────────────────────────┐
│  Unlock Account                    [×]  │
├─────────────────────────────────────────┤
│  Account: alice@work                    │
│                                         │
│  Password:                              │
│  [________________________]             │
│                                         │
│  ❌ Incorrect password (if failed)      │
│                                         │
│           [Cancel] [Unlock]             │
└─────────────────────────────────────────┘
```

### Enhanced Create/Save Flow

**Phase 2 Behavior (Before Phase 4):**

```
[✓] Save to this browser
```

**Phase 4 Behavior (After Implementation):**

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

### Enhanced List View

**Phase 2 List Item:**

```
┌─────────────────────────────────────────┐
│  GitHub - work@example.com              │
│  Created: 2 days ago                    │
│  [View] [Export URL] [Delete]           │
└─────────────────────────────────────────┘
```

**Phase 4 List Item (with account):**

```
┌─────────────────────────────────────────┐
│  GitHub - work@example.com              │
│  Created: 2 days ago                    │
│  👤 alice@work                          │
│  [View] [Export URL] [Delete]           │
└─────────────────────────────────────────┘
```

**Click "View" Behavior:**

**Without Account (Phase 2):**
- Always prompt for passphrase

**With Account (Phase 4):**
- If account is unlocked: Automatically decrypt and show TOTP (no prompt)
- If account is locked: Show unlock dialog, then show TOTP
- Update `lastActivity` timestamp for auto-lock

### Auto-Lock Mechanism

**Implementation:**

```typescript
// Check every 30 seconds
setInterval(() => {
  if (!autoLockSettings.enabled) return;

  const now = Date.now();
  const timeoutMs = autoLockSettings.timeoutMinutes * 60 * 1000;

  unlockedAccounts.forEach((account, accountId) => {
    if (now - account.lastActivity > timeoutMs) {
      lockAccount(accountId);
      showToast(`Account "${account.username}" locked due to inactivity`);
    }
  });
}, 30000);
```

**Activity Events (reset lastActivity):**
- Viewing a TOTP with account passphrase
- Saving a new TOTP to the account
- Unlocking the account
- Any user interaction with account-related UI

## Encryption & Key Derivation

### Account Password Handling

**Two Separate Derivations:**

1. **Password Hash (for login verification):**
```typescript
// Stored in Account.passwordHash
const passwordHash = await pbkdf2(
  password,
  account.salt, // Account-specific salt
  100_000, // iterations
  256 // bits
);
// Compared during unlock to verify password
```

2. **Encryption Key (for passphrase encryption):**
```typescript
// Kept in memory in UnlockedAccount.encryptionKey
const encryptionKey = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt: account.keySalt, // Different salt!
    iterations: 100_000,
    hash: 'SHA-256'
  },
  passwordKey,
  { name: 'AES-GCM', length: 256 },
  false, // not extractable
  ['encrypt', 'decrypt']
);
```

**Why Two Salts?**
- `salt`: For password verification (stored hash compared on login)
- `keySalt`: For deriving encryption key (never stored, only used in memory)

### Passphrase Encryption

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

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    account.encryptionKey,
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

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    account.encryptionKey,
    combined
  );

  return new TextDecoder().decode(decrypted);
}
```

## Features

### Account Lifecycle

**Create Account:**
1. User enters username and password (min 8 chars)
2. Generate two random salts (salt, keySalt)
3. Derive password hash for verification
4. Store Account record in IndexedDB
5. Automatically unlock account (derive key, add to unlockedAccounts)

**Unlock Account:**
1. User enters password
2. Derive password hash using stored salt
3. Compare with stored passwordHash
4. If match: derive encryption key, add to unlockedAccounts
5. If no match: show error, allow retry

**Lock Account:**
1. Remove from unlockedAccounts map
2. Encryption key is garbage collected
3. User must unlock again to access saved passphrases

**Delete Account:**
1. Show confirmation warning: "This will delete X saved passphrases. TOTPs will remain but require manual passphrase entry."
2. Delete Account record
3. Delete all EncryptedPassphrase records with matching accountId
4. Update all TOTPRecords: clear `savedWithAccount` field
5. Remove from unlockedAccounts if unlocked

### Account Selection Indicators

**Visual States:**

- ✅ **Unlocked**: Green indicator, username shown
- 🔒 **Locked**: Gray indicator, "Click to unlock" affordance
- ⏰ **Auto-lock timer**: Show countdown in account list ("Auto-locks in 5m")

### Settings Integration

**New Settings Section:**

```
┌─────────────────────────────────────────┐
│  Settings                          [×]  │
├─────────────────────────────────────────┤
│  Accounts                               │
│  • Manage accounts and auto-lock        │
│    [Manage Accounts]                    │
│                                         │
│  Auto-Lock Settings                     │
│  [✓] Enable auto-lock                   │
│  Lock after [15 ▼] minutes of inactivity│
│     Options: 5, 10, 15, 30, 60, Never   │
│                                         │
│  Security                               │
│  [Lock All Accounts Now]                │
└─────────────────────────────────────────┘
```

## Security Considerations

### Threat Model

**What accounts protect against:**
- ✅ Casual passphrase theft (someone quickly checking browser storage)
- ✅ Convenience without storing passphrases in plaintext
- ✅ Auto-lock provides time-limited exposure

**What accounts do NOT protect against:**
- ❌ Malware with memory access (can extract encryption keys)
- ❌ XSS attacks while account is unlocked
- ❌ Physical access to unlocked browser (keys in memory)
- ❌ Browser extensions with full page access

**User Understanding:**
- Show warning during account creation about security limitations
- Emphasize: This is convenience, not vault-level security
- Accounts are browser-local only, no cloud sync

### Password Requirements

**Minimum Security:**
- 8 characters minimum (enforced)
- No maximum length (within reasonable limits)
- No complexity requirements (users choose their own risk)

**Best Practices (recommended, not enforced):**
- Use unique password for each account
- Consider using a password manager
- Don't reuse TOTP passphrases as account passwords

### Recovery & Backup

**No Password Recovery:**
- Forgotten account password = permanent loss of access
- Passphrases cannot be decrypted without the account password
- TOTPs remain accessible but require manual passphrase entry

**Export Options:**
- Accounts are NOT exportable (no way to export encryption keys)
- TOTPs can still be exported as URLs (Phase 2 feature)
- If user loses account access, they must manually re-enter passphrases

## Migration & Compatibility

### Phase 1 Compatibility
- Stateless URLs continue to work identically
- No changes to URL fragment format

### Phase 2 Compatibility
- Existing Phase 2 saved TOTPs work unchanged
- Can retroactively add passphrase to account:
  1. View TOTP → Enter passphrase manually
  2. Click "Save passphrase to account" button
  3. Select account → Passphrase encrypted and saved

### Upgrade Path
- Phase 4 is purely additive
- IndexedDB schema upgrade from version 2 to 3
- No data migration needed for existing TOTPs

## Testing Requirements

Use **Vitest** for unit tests and **Playwright** for E2E tests.

### tests/account-creation.spec.ts

- Create account with valid username and password
- Reject password shorter than 8 characters
- Reject mismatched password confirmation
- Reject duplicate usernames
- Verify account automatically unlocked after creation
- Test password hashing and key derivation

### tests/account-unlock-lock.spec.ts

- Unlock account with correct password
- Reject incorrect password with error message
- Lock account manually
- Lock account automatically after timeout
- Multiple accounts unlocked simultaneously
- Verify encryption key removed from memory on lock

### tests/passphrase-storage.spec.ts

- Save TOTP with passphrase to account
- Retrieve passphrase from unlocked account
- Cannot retrieve passphrase from locked account
- Delete account removes all associated passphrases
- Passphrase encryption/decryption round-trip

### tests/auto-lock.spec.ts

- Configure auto-lock timeout
- Disable auto-lock entirely
- Activity resets auto-lock timer
- Multiple accounts lock independently
- Toast notification on auto-lock

### tests/ui-account-flow.spec.ts

- View TOTP with account passphrase (auto-decrypt)
- View TOTP without account (prompt for passphrase)
- Create TOTP with "save to account" option
- Delete account affects TOTP display (shows account deleted)
- Lock all accounts button works

### tests/account-indexeddb.spec.ts

- Account CRUD operations
- EncryptedPassphrase CRUD operations
- IndexedDB indexes work correctly
- Schema migration from version 2 to 3
- Quota handling for account data

## Implementation Notes

### Database Migration

```typescript
// Upgrade from Phase 2 (version 2) to Phase 4 (version 3)
const request = indexedDB.open('totp-storage', 3);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const oldVersion = event.oldVersion;

  if (oldVersion < 3) {
    // Create accounts object store
    const accountsStore = db.createObjectStore('accounts', {
      keyPath: 'id',
      autoIncrement: true
    });
    accountsStore.createIndex('username', 'username', { unique: true });

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

### Auto-Lock Implementation

**Activity Tracking:**

```typescript
// Svelte component lifecycle
$effect(() => {
  const handleActivity = () => {
    unlockedAccounts.forEach((account) => {
      account.lastActivity = Date.now();
    });
  };

  // Track user interactions
  window.addEventListener('click', handleActivity);
  window.addEventListener('keydown', handleActivity);
  window.addEventListener('touchstart', handleActivity);

  return () => {
    window.removeEventListener('click', handleActivity);
    window.removeEventListener('keydown', handleActivity);
    window.removeEventListener('touchstart', handleActivity);
  };
});
```

**Lock Timer:**

```typescript
// Start on mount
$effect(() => {
  const lockInterval = setInterval(() => {
    checkAndLockInactiveAccounts();
  }, 30000); // Check every 30 seconds

  return () => clearInterval(lockInterval);
});
```

### Error Handling

**Account Operations:**
- Account not found → Show error toast
- Account already exists → Show error in dialog
- Password incorrect → Show inline error, allow retry
- Database error → Graceful fallback, suggest browser refresh

**Passphrase Operations:**
- Cannot decrypt → Account may be locked, prompt to unlock
- Passphrase not found → Fall back to manual entry
- Encryption error → Show error, allow manual passphrase entry

## Success Criteria

Phase 4 is complete when:

- [ ] Can create accounts with username and password
- [ ] Can unlock and lock accounts
- [ ] Can save TOTPs with passphrases to accounts
- [ ] Viewing TOTP with account passphrase auto-decrypts when unlocked
- [ ] Auto-lock works with configurable timeout
- [ ] Multiple accounts can be unlocked simultaneously
- [ ] Can delete accounts (with confirmation)
- [ ] Account activity tracking resets auto-lock timer
- [ ] Settings UI for account management and auto-lock config
- [ ] Enhanced create/save flow with account dropdown
- [ ] List view shows account association
- [ ] Phase 1 and Phase 2 functionality unchanged
- [ ] All code is checked for duplication and refactoring is done
- [ ] All unnecessary comments are removed
- [ ] All tests pass
- [ ] Documentation updated (README if user-facing changes)
