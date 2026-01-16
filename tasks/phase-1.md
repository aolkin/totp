# Phase 1: Stateless TOTP PWA - MVP

## Project Overview

Build a fully client-side, stateless TOTP (Time-based One-Time Password) authenticator as a Progressive Web App. The entire application fits in a single HTML file deployable to GitHub Pages.

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
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "label": "GitHub - user@example.com",
  "digits": 6,
  "period": 30,
  "algorithm": "SHA1"
}
```

To keep the URLs as short as possible, consider ways to minimize the size of the above structure and avoid any redundant data.

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
   - Validation: Must match `^[A-Z2-7]+=*$` (Base32)
   - allow spaces in the input but remove them for processing. ensure there is a test case for this.

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

consider if there is value to user-selected algorithm or if we should just always use the secure option for simplicity.

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

### manifest.json (inline in HTML)
```json
{
  "name": "TOTP Authenticator",
  "short_name": "TOTP",
  "description": "Secure, stateless TOTP authenticator",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg>...</svg>",
      "sizes": "192x192",
      "type": "image/svg+xml"
    },
    {
      "src": "data:image/svg+xml,<svg>...</svg>",
      "sizes": "512x512",
      "type": "image/svg+xml"
    }
  ]
}
```

### Service Worker
- Cache HTML file for offline access
- Cache otpauth library
- Serve from cache, fallback to network
- Update cache on new version

### Install Prompt
- Show "Install App" button if browser supports PWA
- Handle `beforeinstallprompt` event

## Implementation Details

### Passphrase Generation
Use BIP39 word list (2048 words, built-in or via CDN). Select 5 random words for ~64 bits entropy.

Alternative: Simple 5-word generator with common English words (ensure ~60+ bit entropy).

### TOTP Code Generation
Use `otpauth` library:
```typescript
import { TOTP } from 'otpauth';

const totp = new TOTP({
  secret: secretBase32,
  digits: 6,
  period: 30,
  algorithm: 'SHA1'
});

const code: string = totp.generate();
```

### Auto-refresh Logic
```typescript
setInterval(() => {
  updateCode();
  updateCountdown();
}, 1000);

function updateCountdown(): void {
  const now = Math.floor(Date.now() / 1000);
  const remaining = 30 - (now % 30);
  const countdownElement = document.getElementById('countdown');
  if (countdownElement) {
    countdownElement.textContent = remaining.toString();
  }

  if (remaining === 30) {
    updateCode(); // Generate new code
  }
}
```

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
├── service-worker.ts       (PWA service worker)
└── vite-env.d.ts           (Vite environment types)
index.html                  (entry HTML)
vite.config.ts              (Vite configuration)
tsconfig.json               (TypeScript configuration)
package.json                (dependencies)
```

The application will be built into a `dist/` directory for deployment.

## Testing Requirements

### Playwright Setup

**Install:**
```bash
npm install -D @playwright/test
npx playwright install
```

**playwright.config.ts:**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
});
```

### Test Scenarios

**tests/encryption.spec.ts:**
- Test PBKDF2 key derivation with known vectors
- Test AES-GCM encryption/decryption roundtrip
- Test empty passphrase mode
- Test URL encoding/decoding

**tests/totp-generation.spec.ts:**
- Test TOTP code generation with RFC 6238 test vectors
- Verify code changes every 30 seconds
- Test different algorithms (SHA1, SHA256, SHA512)
- Test different digit counts (6, 7, 8)

**tests/ui-create.spec.ts:**
- Fill form with valid secret → verify URL generated
- Test passphrase regeneration
- Test custom passphrase with strength validation
- Test validation errors (invalid Base32, short passphrase)
- Test advanced options (digits, period, algorithm)

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

### Running Tests
```bash
npx playwright test
npx playwright test --headed  # Watch tests run
npx playwright test --debug   # Debug mode
```

### GitHub Actions

Create a GitHub action to run the tests for PRs and post the resulting screenshots to the PR as comments.

## Deployment

**Build Process:**
```bash
npm run build  # Creates optimized dist/ directory
```

**GitHub Pages:**
1. Build the application: `npm run build`
2. Deploy the `dist/` directory to GitHub Pages
3. Enable Pages in Settings → Pages → Source: gh-pages branch or GitHub Actions
4. Access at `https://username.github.io/repo-name/`

**Vite Configuration for GitHub Pages:**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/repo-name/',  // Set base path for GitHub Pages
  // ... other config
});
```

**Custom Domain:**
1. Add `CNAME` file with domain totp.starmaze.dev to the `dist/` folder (or public/ folder to have Vite copy it)
2. Configure DNS: `CNAME` record pointing to `username.github.io`
3. Enable HTTPS in Pages settings

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

## Success Criteria

Phase 1 is complete when:
- [x] Application builds successfully with Vite
- [x] Build output is optimized and production-ready
- [ ] All Playwright tests pass
- [x] PWA installs on mobile and desktop (manifest and service worker implemented)
- [x] Works offline after first load (service worker caching implemented)
- [ ] Create → View flow works end-to-end
- [x] TypeScript compilation succeeds with no errors
- [ ] All code is checked for duplication and refactoring is done to ensure no duplication exists
- [ ] All unnecessary comments are removed, code should be self-documenting

## Implementation Status

### PWA Caching (Phase 1 - Implemented)
- ✅ manifest.json created with app metadata and icons
- ✅ Service worker implemented with offline caching strategy
  - Cache-first for static assets (JS, CSS)
  - Network-first for HTML documents with offline fallback
  - Automatic cache versioning and cleanup
- ✅ Service worker registration in main.ts
- ✅ Vite build configuration updated to build and output service worker
- ✅ PWA icons created (SVG format for scalability)
- ⏸️ PWA UI elements (install prompt, offline indicators) - deferred
- ⏸️ PWA tests - deferred