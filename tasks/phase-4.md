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
  keySalt: Uint8Array; // Separate salt for KEK derivation
  encryptedDEK: { // Wrapped data encryption key (DEK encrypted with KEK)
    iv: Uint8Array;
    ciphertext: Uint8Array;
    tag: Uint8Array;
  };
  autoLockMinutes: number; // Per-account auto-lock timeout (0 = never)
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
  dataEncryptionKey: CryptoKey; // DEK (unwrapped from encryptedDEK)
  autoLockMinutes: number; // Per-account setting
  unlockedAt: number; // timestamp
  lastActivity: number; // timestamp for auto-lock
}

// Svelte store (reactive)
const unlockedAccounts = $state<Map<number, UnlockedAccount>>(new Map());
```

**Note on Auto-Lock:** Auto-lock settings are stored per-account in the `Account.autoLockMinutes` field. Each account can have its own timeout or disable auto-lock entirely (0 = never lock).

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
│     Auto-lock: 15 minutes               │
│     [Lock] [Edit] [Delete Account]      │
├─────────────────────────────────────────┤
│  👤 bob@personal                        │
│     🔒 Locked • 5 TOTPs saved           │
│     Auto-lock: Never                    │
│     [Unlock] [Edit] [Delete Account]    │
└─────────────────────────────────────────┘
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
│  Auto-lock after inactivity:            │
│  [15 minutes ▼]                         │
│    Options: 5m, 10m, 15m, 30m, 1h, Never│
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
- Auto-lock: Default 15 minutes, options include 5, 10, 15, 30, 60 minutes, or Never (0)

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

**Edit Account Settings Dialog:**

```
┌─────────────────────────────────────────┐
│  Edit Account: alice@work          [×]  │
├─────────────────────────────────────────┤
│  Auto-lock after inactivity:            │
│  [15 minutes ▼]                         │
│    Options: 5m, 10m, 15m, 30m, 1h, Never│
│                                         │
│  Change Password:                       │
│  [ ] Update password                    │
│                                         │
│  (if checked, show fields below)        │
│  Current Password:                      │
│  [________________________]             │
│                                         │
│  New Password:                          │
│  [________________________]             │
│                                         │
│  Confirm New Password:                  │
│  [________________________]             │
│                                         │
│  ⚠️  Password change requires account   │
│      to be unlocked first               │
│                                         │
│           [Cancel] [Save Changes]       │
└─────────────────────────────────────────┘
```

**Logic:**
- Auto-lock setting can always be updated
- Password change requires:
  1. Account must be unlocked (or prompt to unlock first)
  2. Current password verification
  3. New password minimum 8 characters
  4. Confirmation must match
- On password change: Re-wrap DEK with new password-derived KEK (no TOTP passphrase re-encryption needed)

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
  const now = Date.now();

  unlockedAccounts.forEach((account, accountId) => {
    // Skip if auto-lock disabled for this account (0 = never)
    if (account.autoLockMinutes === 0) return;

    const timeoutMs = account.autoLockMinutes * 60 * 1000;

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

### Two-Step Encryption Architecture (Key Wrapping)

This system uses a **key wrapping pattern** to enable efficient password changes without re-encrypting all TOTP passphrases.

**Key Hierarchy:**

1. **Password** (user-provided) → derives KEK (Key Encryption Key)
2. **KEK** (password-derived) → wraps/unwraps DEK (Data Encryption Key)
3. **DEK** (randomly generated) → encrypts/decrypts TOTP passphrases

**Benefits:**
- Password change: Only re-wrap DEK (O(1) operation)
- Without key wrapping: Must re-encrypt all passphrases (O(n) operation)
- DEK never changes, so encrypted passphrases remain valid

### Account Creation Flow

**Step 1: Generate Keys and Salts**

```typescript
async function createAccount(username: string, password: string, autoLockMinutes: number) {
  // Generate salts
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keySalt = crypto.getRandomValues(new Uint8Array(16));

  // Step 2: Derive password hash for verification
  const passwordHash = await pbkdf2(password, salt, 100_000, 256);

  // Step 3: Generate random DEK (Data Encryption Key)
  const dek = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable (needed for wrapping)
    ['encrypt', 'decrypt']
  );

  // Step 4: Derive KEK (Key Encryption Key) from password
  const kek = await deriveKEK(password, keySalt);

  // Step 5: Wrap DEK with KEK
  const wrappedDEK = await crypto.subtle.wrapKey(
    'raw',
    dek,
    kek,
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) }
  );

  // Step 6: Store account with wrapped DEK
  const account: Account = {
    username,
    passwordHash,
    salt,
    keySalt,
    encryptedDEK: {
      iv: wrappedDEK.iv,
      ciphertext: new Uint8Array(wrappedDEK.slice(0, -16)),
      tag: new Uint8Array(wrappedDEK.slice(-16))
    },
    autoLockMinutes,
    created: Date.now(),
    lastUsed: Date.now()
  };

  await db.add('accounts', account);
}
```

**Helper: Derive KEK from Password**

```typescript
async function deriveKEK(password: string, keySalt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: keySalt,
      iterations: 100_000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['wrapKey', 'unwrapKey'] // KEK is only used for wrapping/unwrapping DEK
  );
}
```

### Account Unlock Flow

**Unwrap DEK and Store in Memory:**

```typescript
async function unlockAccount(accountId: number, password: string): Promise<void> {
  const account = await db.get('accounts', accountId);

  // Step 1: Verify password
  const passwordHash = await pbkdf2(password, account.salt, 100_000, 256);
  if (passwordHash !== account.passwordHash) {
    throw new Error('Incorrect password');
  }

  // Step 2: Derive KEK from password
  const kek = await deriveKEK(password, account.keySalt);

  // Step 3: Unwrap DEK using KEK
  const { iv, ciphertext, tag } = account.encryptedDEK;
  const wrappedDEK = new Uint8Array([...ciphertext, ...tag]);

  const dek = await crypto.subtle.unwrapKey(
    'raw',
    wrappedDEK,
    kek,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt']
  );

  // Step 4: Store DEK in memory
  unlockedAccounts.set(accountId, {
    accountId,
    username: account.username,
    dataEncryptionKey: dek, // DEK, not KEK!
    autoLockMinutes: account.autoLockMinutes,
    unlockedAt: Date.now(),
    lastActivity: Date.now()
  });
}
```

### Password Change Flow

**Re-wrap DEK with New Password (No Passphrase Re-encryption)**

```typescript
async function changeAccountPassword(
  accountId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const account = await db.get('accounts', accountId);

  // Step 1: Verify current password
  const passwordHash = await pbkdf2(currentPassword, account.salt, 100_000, 256);
  if (passwordHash !== account.passwordHash) {
    throw new Error('Incorrect current password');
  }

  // Step 2: Get DEK from unlocked account (or unwrap it)
  let dek: CryptoKey;
  const unlockedAccount = unlockedAccounts.get(accountId);
  if (unlockedAccount) {
    dek = unlockedAccount.dataEncryptionKey;
  } else {
    // Unwrap DEK using current password
    const currentKEK = await deriveKEK(currentPassword, account.keySalt);
    const { iv, ciphertext, tag } = account.encryptedDEK;
    const wrappedDEK = new Uint8Array([...ciphertext, ...tag]);
    dek = await crypto.subtle.unwrapKey(
      'raw',
      wrappedDEK,
      currentKEK,
      { name: 'AES-GCM', iv },
      { name: 'AES-GCM', length: 256 },
      true, // temporarily extractable for re-wrapping
      ['encrypt', 'decrypt']
    );
  }

  // Step 3: Generate new salt and derive new password hash
  const newSalt = crypto.getRandomValues(new Uint8Array(16));
  const newKeySalt = crypto.getRandomValues(new Uint8Array(16));
  const newPasswordHash = await pbkdf2(newPassword, newSalt, 100_000, 256);

  // Step 4: Derive new KEK from new password
  const newKEK = await deriveKEK(newPassword, newKeySalt);

  // Step 5: Re-wrap DEK with new KEK
  const newWrappedDEK = await crypto.subtle.wrapKey(
    'raw',
    dek,
    newKEK,
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) }
  );

  // Step 6: Update account record (DEK is the same, only wrapper changed)
  await db.update('accounts', accountId, {
    passwordHash: newPasswordHash,
    salt: newSalt,
    keySalt: newKeySalt,
    encryptedDEK: {
      iv: newWrappedDEK.iv,
      ciphertext: new Uint8Array(newWrappedDEK.slice(0, -16)),
      tag: new Uint8Array(newWrappedDEK.slice(-16))
    }
  });

  // All encrypted passphrases remain valid (DEK unchanged)!
}
```

### Passphrase Encryption (Using DEK)

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

  // Encrypt passphrase with DEK (not KEK!)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    account.dataEncryptionKey, // DEK
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
    account.dataEncryptionKey, // DEK
    combined
  );

  return new TextDecoder().decode(decrypted);
}
```

**Why This Works:**
- DEK never changes, so all encrypted passphrases remain valid
- Password change only affects the wrapper around DEK
- No need to decrypt and re-encrypt N passphrases
- Efficient O(1) password change regardless of number of TOTPs

## Features

### Account Lifecycle

**Create Account:**
1. User enters username, password (min 8 chars), and auto-lock setting
2. Generate two random salts (salt for password verification, keySalt for KEK derivation)
3. Derive password hash for login verification
4. Generate random DEK (Data Encryption Key)
5. Derive KEK (Key Encryption Key) from password
6. Wrap DEK with KEK and store in `encryptedDEK` field
7. Store Account record in IndexedDB with wrapped DEK
8. Automatically unlock account (unwrap DEK, store in memory)

**Unlock Account:**
1. User enters password
2. Derive password hash using stored salt
3. Compare with stored passwordHash
4. If match: derive KEK, unwrap DEK, add to unlockedAccounts with DEK
5. If no match: show error, allow retry

**Lock Account:**
1. Remove from unlockedAccounts map
2. DEK is garbage collected from memory
3. User must unlock again to access saved passphrases

**Change Password:**
1. Verify current password
2. Get DEK from unlocked account (or unwrap with current password)
3. Derive new KEK from new password
4. Re-wrap DEK with new KEK
5. Update Account record with new password hash and wrapped DEK
6. All encrypted passphrases remain valid (DEK unchanged)

**Update Auto-Lock Setting:**
1. Update `autoLockMinutes` field in Account record
2. If account is unlocked, update in-memory UnlockedAccount as well

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
│  Security                               │
│  [Lock All Accounts Now]                │
└─────────────────────────────────────────┘
```

**Note:** Auto-lock settings are configured per-account, not globally. Each account has its own timeout setting that can be adjusted in the Edit Account dialog.

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

- Create account with valid username, password, and auto-lock setting
- Reject password shorter than 8 characters
- Reject mismatched password confirmation
- Reject duplicate usernames
- Verify account automatically unlocked after creation
- Test password hashing and key derivation
- Verify DEK generation and wrapping with KEK
- Test different auto-lock timeout options (5m, 15m, 30m, 60m, Never)

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

- Configure auto-lock timeout per account
- Disable auto-lock entirely (set to Never/0)
- Activity resets auto-lock timer
- Multiple accounts lock independently with different timeouts
- Toast notification on auto-lock
- Each account respects its own timeout setting

### tests/account-password-change.spec.ts

- Change password with correct current password
- Reject incorrect current password
- Verify DEK re-wrapped with new KEK
- All passphrases remain decryptable after password change
- Can unlock with new password after change
- Cannot unlock with old password after change
- Password change updates account record in IndexedDB

### tests/account-settings-update.spec.ts

- Update auto-lock timeout for account
- Change auto-lock from enabled to disabled (Never)
- Change auto-lock from disabled to enabled
- Settings persist across lock/unlock
- Settings update reflected in UI immediately
- Multiple accounts have independent settings

### tests/ui-account-flow.spec.ts

- View TOTP with account passphrase (auto-decrypt)
- View TOTP without account (prompt for passphrase)
- Create TOTP with "save to account" option
- Delete account affects TOTP display (shows account deleted)
- Lock all accounts button works
- Edit account settings dialog opens and saves changes
- Password change through Edit dialog works correctly
- Auto-lock setting update through Edit dialog works
- Account list shows correct auto-lock settings

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

- [ ] Can create accounts with username, password, and auto-lock setting
- [ ] DEK generation and wrapping with KEK implemented correctly
- [ ] Can unlock and lock accounts
- [ ] Can save TOTPs with passphrases to accounts (encrypted with DEK)
- [ ] Viewing TOTP with account passphrase auto-decrypts when unlocked
- [ ] Auto-lock works with per-account configurable timeout
- [ ] Multiple accounts can be unlocked simultaneously with independent timeouts
- [ ] Can change account password (re-wraps DEK without re-encrypting passphrases)
- [ ] Can update account auto-lock settings
- [ ] Can delete accounts (with confirmation)
- [ ] Account activity tracking resets auto-lock timer
- [ ] Edit Account dialog for password and auto-lock changes
- [ ] Account management UI shows per-account auto-lock settings
- [ ] Enhanced create/save flow with account dropdown
- [ ] List view shows account association
- [ ] Phase 1 and Phase 2 functionality unchanged
- [ ] All code is checked for duplication and refactoring is done
- [ ] All unnecessary comments are removed
- [ ] All tests pass
- [ ] Documentation updated (README if user-facing changes)
