# Phase 1: Stateless TOTP PWA - MVP

## Project Overview

Build a fully client-side, stateless TOTP (Time-based One-Time Password) authenticator as a Progressive Web App.

**Core Concept:** TOTP secrets are encrypted client-side and embedded in the URL fragment. No server storage required. Zero server trust.

**URL Format:**
```
https://yourdomain.com/#<base64-encoded-encrypted-data>
```

Everything after `#` never reaches the server.

## Technical Requirements

### Stack
- **Framework:** Svelte with TypeScript
- **Build Tool:** Vite
- **Dependencies:** `otpauth` library (npm package)
- **APIs:** Web Crypto API (built-in), Service Worker API
- **Hosting:** GitHub Pages (static build output)

### Browser Support
- Modern browsers with Web Crypto API support (Chrome 37+, Firefox 34+, Safari 11+)
- Service Worker support for PWA functionality (gracefully degrade if unavailable)

## Cryptography Specification

### Key Derivation
```
PBKDF2-SHA256
- Iterations: 100,000
- Salt: 16 bytes (randomly generated)
- Output: 256-bit key
```

### Encryption
```
AES-256-GCM
- IV: 12 bytes (randomly generated)
- Tag length: 128 bits
- Input: TOTP secret (Base32 string) + metadata JSON
```

### URL Structure
The fragment contains Base64-encoded binary data:
```
[16 bytes salt][12 bytes IV][N bytes ciphertext][16 bytes auth tag]
```

### Metadata (encrypted with secret)

**URL Optimization:** Use short keys and omit default values to minimize URL length.

Defaults: `digits=6`, `period=30`, `algorithm="SHA1"`

```json
{
  "s": "JBSWY3DPEHPK3PXP",
  "l": "GitHub - user@example.com"
}
```

Full structure (when non-default values are used):
```json
{
  "s": "JBSWY3DPEHPK3PXP",
  "l": "GitHub",
  "d": 8,
  "p": 60,
  "a": "SHA256"
}
```

Keys: `s`=secret, `l`=label, `d`=digits, `p`=period, `a`=algorithm

### Empty Passphrase Handling
If user provides empty/no passphrase:
- Use fixed string "NO_PASSPHRASE" as key material
- This provides URL-only security (128-bit entropy from URL randomness)
- Display warning: "Anyone with this URL can access the TOTP code"

## UI/UX Requirements

### Create Mode (Default)

**Form Fields:**
1. **TOTP Secret** (required)
   - Text input, monospace font
   - Placeholder: "aaaa bbbb cccc dddd"
   - Help text: "Enter the key provided by the service"
   - Input handling: Accept spaces for user convenience, strip them before validation
   - Validation: After removing spaces, must match `^[A-Z2-7]+=*$` (Base32)
   - Test case required: "JBSW Y3DP EHPK 3PXP" → "JBSWY3DPEHPK3PXP"

2. **Label** (optional)
   - Text input
   - Placeholder: "Website - user@example.com"
   - Help text: "A description to identify this TOTP"

3. **Passphrase** (optional, auto-generated)
   - Generate 5-word BIP39/diceware phrase on page load
   - Display generated phrase with "Regenerate" button
   - Toggle to "Custom passphrase" mode if the user edits the passphrase manually, and leave that mode when the regenerate button is pressed.
   - If custom: show strength meter (zxcvbn or simple entropy calculation)
   - Minimum custom passphrase: 12 characters (enforced)

4. **Advanced Options** (collapsed by default)
   - Digits: dropdown (6, 7, 8) - default 6
   - Period: input (default 30 seconds)
   - Algorithm: dropdown (SHA1, SHA256, SHA512) - default SHA1
   - Note: Algorithm selection is required for compatibility. The issuing service determines which algorithm to use, not the user. Most services use SHA1 (RFC 6238 standard), but some (e.g., AWS) require SHA256.

**Submit Button:** "Generate TOTP URL"

**Result Display:**
- Show generated URL in copyable text box
- Show passphrase separately (if not empty)
- Clear warning: "Save this URL and passphrase. They cannot be recovered."
- "Create Another" button to reset form

### View Mode (URL with fragment)

**On page load with fragment:**
1. Parse fragment, extract salt/IV/ciphertext
2. Check if passphrase needed (try decrypt with empty passphrase first)
3. If decryption fails, show passphrase prompt
4. On successful decrypt, show TOTP display

**Passphrase Prompt:**
- Single password input field
- "Unlock" button
- Error message on wrong passphrase: "Incorrect passphrase"
- No retry limit (client-side only, no server to rate-limit)

**TOTP Display:**
- Large, centered 6-digit code (font-size: 4rem, monospace)
- Label above code (if provided)
- Countdown timer with circle meter showing seconds until next code (30 - (now % 30))
- Auto-refresh code every 30 seconds
- "Copy Code" button
- "Create New TOTP" link back to create mode

### Responsive Design
- Mobile-first approach
- Viewport meta tag for proper mobile rendering
- Touch-friendly tap targets (min 44px)
- Code readable on small screens

## PWA Implementation

PWA manifest and service worker are already implemented with offline-first caching. Future enhancements can include:
- Install prompt UI
- Offline status indicators

## Implementation Details

### Passphrase Generation
Use BIP39 word list or simple 5-word generator with ~60+ bit entropy.

### TOTP Code Generation
Use `otpauth` library to generate codes with configurable digits, period, and algorithm.

### Auto-refresh Logic
Update code and countdown every second. When countdown reaches 30, generate new code.

### Error Handling
- Invalid Base32 secret: Show error on form submission
- Decryption failure: Show passphrase prompt or error
- Missing Web Crypto API: Show "Browser not supported" message

## File Structure

```
src/
├── App.svelte              (main application component)
├── main.ts                 (application entry point)
├── components/
│   ├── CreateForm.svelte   (TOTP creation form)
│   ├── TotpDisplay.svelte  (TOTP code display)
│   └── PassphrasePrompt.svelte
├── lib/
│   ├── crypto.ts           (encryption/decryption logic)
│   ├── totp.ts             (TOTP generation)
│   └── types.ts            (TypeScript type definitions)
└── service-worker.ts       (PWA service worker - already implemented)
```

## Testing Requirements

Playwright is already configured. Create tests in `tests/` directory.

### Test Scenarios

**tests/encryption.spec.ts:**
- Test PBKDF2 key derivation with known vectors
- Test AES-GCM encryption/decryption roundtrip
- Test empty passphrase mode
- Test URL encoding/decoding
- Test metadata serialization uses short keys (`s`, `l`, `d`, `p`, `a`)
- Test default values are omitted from metadata
- Test non-default values are included in metadata

**tests/totp-generation.spec.ts:**
- Test TOTP code generation with RFC 6238 test vectors
- Verify code changes every 30 seconds
- Test different algorithms (SHA1, SHA256, SHA512)
- Test different digit counts (6, 7, 8)

**tests/ui-create.spec.ts:**
- Fill form with valid secret → verify URL generated
- Test secret input with spaces → verify spaces stripped (e.g., "JBSW Y3DP EHPK 3PXP")
- Test passphrase regeneration
- Test custom passphrase with strength validation
- Test validation errors (invalid Base32, short passphrase)
- Test advanced options (digits, period, algorithm)
- Test URL contains minimal metadata (defaults omitted)

**tests/ui-view.spec.ts:**
- Navigate to URL with fragment → verify TOTP displayed
- Test passphrase prompt on encrypted URL
- Test wrong passphrase → error shown
- Test countdown timer updates
- Test auto-refresh after 30 seconds
- Test copy button functionality

**tests/pwa.spec.ts:**
- Verify manifest.json served correctly
- Verify service worker registers
- Test offline mode (service worker caches resources)
- Test install prompt (if testable)

**tests/e2e.spec.ts:**
- Full flow: Create → Copy URL → Open in new tab → Enter passphrase → See code
- Create with empty passphrase → Open URL → Code displays immediately
- Create with label → Verify label shows in view mode

## Deployment

The project is configured to deploy to GitHub Pages. Build with `npm run build` to create the optimized `site/` directory.

## Security Considerations

**Strengths:**
- Zero server trust (everything client-side)
- Strong encryption (AES-256-GCM)
- High entropy URLs (128+ bits)
- Optional passphrase adds defense-in-depth

**Weaknesses:**
- URL leak = secret leak (if no passphrase)
- No passphrase recovery (by design)
- Client-side crypto assumes browser integrity
- Phishing risk (fake site could steal secrets)

**Mitigation:**
- Warn users about URL security
- Encourage passphrase use for shared TOTPs
- Use HTTPS only (enforce in service worker)
- Display clear warnings on empty passphrase

## Implementation Status

### Completed
- ✅ Project setup with Svelte + Vite + TypeScript
- ✅ GitHub Pages deployment configuration (outputs to `site/`)
- ✅ PWA manifest with app metadata and icons
- ✅ Service worker with offline-first caching strategy
  - Automatic cache versioning based on build content hash
  - Vite plugin for automatic cache manifest generation
  - Pre-caching of all build assets on install
- ✅ TypeScript configuration and type checking

### To Implement
- [ ] Cryptography library (`lib/crypto.ts`)
  - PBKDF2 key derivation
  - AES-256-GCM encryption/decryption
  - URL encoding/decoding
  - Metadata serialization with short keys (`s`, `l`, `d`, `p`, `a`)
  - Omit fields with default values to minimize URL length
- [ ] TOTP generation (`lib/totp.ts`)
  - Integration with `otpauth` library
  - Code generation and validation
- [ ] UI Components
  - `CreateForm.svelte` - TOTP creation form with passphrase generation
    - Strip spaces from secret input before validation
    - Support all algorithm options (SHA1, SHA256, SHA512)
  - `TotpDisplay.svelte` - TOTP code display with countdown
  - `PassphrasePrompt.svelte` - Unlock prompt for encrypted URLs
- [ ] Main application logic (`App.svelte`)
  - Route handling (create mode vs view mode)
  - URL fragment parsing
  - State management
- [ ] Playwright test suite
  - Encryption roundtrip tests
  - TOTP generation tests
  - UI flow tests (create/view)
  - E2E tests
- [ ] Code review for duplication and clarity

## Success Criteria

Phase 1 is complete when:
- [ ] All Playwright tests pass
- [ ] Create → View flow works end-to-end
- [ ] PWA installs on mobile and desktop
- [ ] Works offline after first load
- [ ] All code is reviewed for duplication
- [ ] Code is self-documenting with minimal comments