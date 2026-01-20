# Phase 4a: Account Management System

## Status: Not Started

## Overview

Add an account management system that provides the infrastructure for secure passphrase storage (to be used in Phase 4b). This phase focuses solely on creating, managing, and securing user accounts with password-protected encryption keys.

**Key Principle:** Build the account foundation without TOTP integration. Accounts will be ready to encrypt passphrases in Phase 4b.

**Security Model:** Each account has a randomly-generated Data Encryption Key (DEK) wrapped by a password-derived Key Encryption Key (KEK). Accounts unlock in-memory only, never persisting unlocked state to disk.

## Architecture Changes

### Account Storage Design

**IndexedDB Schema (New Object Store):**

```typescript
Database: "totp-storage" (existing from Phase 2)
Version: 3 (upgrade from Phase 2's version 2)

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
```

**Note:** The `encrypted_passphrases` object store will be added in Phase 4b.

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
│     Unlocked • Auto-lock: 15 minutes    │
│     [Lock] [Edit] [Delete Account]      │
├─────────────────────────────────────────┤
│  👤 bob@personal                        │
│     🔒 Locked • Auto-lock: Never        │
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
- On password change: Re-wrap DEK with new password-derived KEK

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
- Unlocking the account
- Any user interaction with account-related UI
- (Phase 4b will add: viewing TOTP, saving TOTP)

## Encryption & Key Derivation

### Two-Step Encryption Architecture (Key Wrapping)

This system uses a **key wrapping pattern** to enable efficient password changes without re-encrypting data (passphrases in Phase 4b).

**Key Hierarchy:**

1. **Password** (user-provided) → derives KEK (Key Encryption Key)
2. **KEK** (password-derived) → wraps/unwraps DEK (Data Encryption Key)
3. **DEK** (randomly generated) → will encrypt/decrypt TOTP passphrases in Phase 4b

**Benefits:**
- Password change: Only re-wrap DEK (O(1) operation)
- Without key wrapping: Must re-encrypt all passphrases (O(n) operation)
- DEK never changes, so encrypted data remains valid

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

  // Step 7: Automatically unlock account
  await unlockAccount(account.id, password);
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

**Re-wrap DEK with New Password (No Data Re-encryption)**

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

  // All encrypted data remains valid (DEK unchanged)!
}
```

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
3. User must unlock again to use account features

**Change Password:**
1. Verify current password
2. Get DEK from unlocked account (or unwrap with current password)
3. Derive new KEK from new password
4. Re-wrap DEK with new KEK
5. Update Account record with new password hash and wrapped DEK
6. All encrypted data remains valid (DEK unchanged)

**Update Auto-Lock Setting:**
1. Update `autoLockMinutes` field in Account record
2. If account is unlocked, update in-memory UnlockedAccount as well

**Delete Account:**
1. Show confirmation warning: "Are you sure? This action is permanent."
2. Delete Account record from IndexedDB
3. Remove from unlockedAccounts if unlocked
4. (Phase 4b will add: delete associated passphrases, update TOTP records)

### Account Selection Indicators

**Visual States:**

- ✅ **Unlocked**: Green indicator, username shown
- 🔒 **Locked**: Gray indicator, "Click to unlock" affordance
- ⏰ **Auto-lock timer**: Show countdown in account list ("Auto-locks in 5m")

## Security Considerations

### Threat Model

**What accounts protect against:**
- ✅ Casual theft (someone quickly checking browser storage)
- ✅ Convenience without storing encryption keys in plaintext
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
- Encryption keys cannot be recovered without the account password
- Future encrypted data (Phase 4b) will be inaccessible

**Export Options:**
- Accounts are NOT exportable (no way to export encryption keys)
- (Phase 4b will handle TOTP export separately)

## Migration & Compatibility

### Phase 1 & 2 Compatibility
- Stateless URLs continue to work identically
- Phase 2 browser storage works unchanged
- Accounts are purely additive

### Upgrade Path
- IndexedDB schema upgrade from version 2 to 3
- Only adds `accounts` object store
- No data migration needed

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

### tests/ui-account-management.spec.ts

- Account management dialog opens and displays accounts
- Lock/unlock buttons work correctly
- Edit account settings dialog opens and saves changes
- Password change through Edit dialog works correctly
- Auto-lock setting update through Edit dialog works
- Account list shows correct auto-lock settings
- "Lock All Accounts Now" button works

### tests/account-indexeddb.spec.ts

- Account CRUD operations
- IndexedDB indexes work correctly
- Schema migration from version 2 to 3
- Quota handling for account data
- Username uniqueness constraint enforced

## Implementation Notes

### Database Migration

```typescript
// Upgrade from Phase 2 (version 2) to Phase 4a (version 3)
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

## Success Criteria

Phase 4a is complete when:

- [ ] Can create accounts with username, password, and auto-lock setting
- [ ] DEK generation and wrapping with KEK implemented correctly
- [ ] Can unlock and lock accounts
- [ ] Auto-lock works with per-account configurable timeout
- [ ] Multiple accounts can be unlocked simultaneously with independent timeouts
- [ ] Can change account password (re-wraps DEK without re-encrypting data)
- [ ] Can update account auto-lock settings
- [ ] Can delete accounts (with confirmation)
- [ ] Account activity tracking resets auto-lock timer
- [ ] Edit Account dialog for password and auto-lock changes
- [ ] Account management UI shows per-account auto-lock settings
- [ ] "Lock All Accounts Now" button works
- [ ] Phase 1 and Phase 2 functionality unchanged
- [ ] All code is checked for duplication and refactoring is done
- [ ] All unnecessary comments are removed
- [ ] All tests pass
- [ ] Ready for Phase 4b integration
