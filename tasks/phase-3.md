# Phase 3: QR Code Scanning

## Status: UI Components Ready ✅

All necessary shadcn-svelte UI components have been added (Jan 2026). Implementation can now proceed.

**Added Components:**
- ✅ switch - For toggling front/rear camera
- ✅ dialog - For camera preview modal (already existed from Phase 1)
- ✅ alert - For error messages (shared with Phase 2)

## Overview

Add camera-based QR code scanning to the create form, allowing users to scan TOTP QR codes directly instead of manually entering Base32 secrets.

**Goal:** Match the UX of mobile authenticator apps (Google Authenticator, Authy, etc.)

**UI Framework:** Continue using Tailwind CSS v4 and shadcn-svelte components established in Phase 1 for consistent styling and user experience.

**Build Process:** Use Vite 7 for development and production builds. All dependencies should be installed via npm, not CDN links.

## Technical Requirements

### Dependencies

Install QR code library via npm:

**Option 1: jsQR** (~30KB) - Pure JavaScript QR decoder
```bash
npm install jsqr
```

**Option 2: qr-scanner** (~15KB, better performance, recommended)
```bash
npm install qr-scanner
```

Choose qr-scanner for better performance unless there's a specific reason to use jsQR. Both work well with Vite's build process.

### Browser APIs

- **getUserMedia** - Camera access
- **Canvas API** - Video frame capture for QR parsing

### TOTP URL Format (otpauth://)

QR codes contain URLs in this format:

```
otpauth://totp/Label?secret=SECRET&issuer=Issuer&algorithm=SHA1&digits=6&period=30
```

**Components:**

- `totp` - Type (always "totp" for TOTP)
- `Label` - Account identifier (e.g., "GitHub:user@example.com")
- `secret` - Base32 secret (required)
- `issuer` - Service name (optional)
- `algorithm` - Hash algorithm (optional, default SHA1)
- `digits` - Code length (optional, default 6)
- `period` - Time step (optional, default 30)

**Parser example:**

```typescript
interface OTPAuthData {
  label: string;
  secret: string;
  issuer: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
}

function parseOTPAuthURL(url: string): OTPAuthData {
  const parsed = new URL(url);
  if (parsed.protocol !== 'otpauth:') throw new Error('Invalid URL');
  if (parsed.host !== 'totp') throw new Error('Only TOTP supported');

  const label = decodeURIComponent(parsed.pathname.slice(1));
  const params = new URLSearchParams(parsed.search);

  const secret = params.get('secret');
  if (!secret) throw new Error('Missing secret parameter');

  return {
    label,
    secret,
    issuer: params.get('issuer') || '',
    algorithm: (params.get('algorithm') as OTPAuthData['algorithm']) || 'SHA1',
    digits: parseInt(params.get('digits') || '6') || 6,
    period: parseInt(params.get('period') || '30') || 30,
  };
}
```

## UI Changes

### Create Form Enhancement

**Add scan button next to secret input:**

```
┌─────────────────────────────────────┐
│ TOTP Secret                         │
│ ┌───────────────────┬─────────────┐ │
│ │ JBSWY3DPEHPK3PXP  │ [Scan QR]   │ │
│ └───────────────────┴─────────────┘ │
└─────────────────────────────────────┘
```

**On "Scan QR" click:**

1. Request camera permission
2. Show camera preview modal
3. Continuously scan for QR codes
4. On detection: Parse → Auto-fill form → Close modal

### Camera Modal

Use shadcn-svelte Dialog component for the modal. Style with Tailwind CSS v4 utilities.

**Layout:**

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │    [Camera Preview]         │   │
│  │                             │   │
│  │    [Scanning Overlay]       │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Point camera at QR code            │
│  [Cancel]                           │
└─────────────────────────────────────┘
```

**Elements:**

- Full-width video preview
- Scanning reticle overlay (animated square)
- Status text: "Scanning..." / "QR Code Detected!"
- Cancel button to close modal
- Auto-close on successful scan

### Mobile Considerations

**Camera selection:**

- Default to rear camera on mobile
- Toggle button to switch front/rear
- Desktop: Use first available camera

**Permissions:**

- Clear error if permission denied
- "Open Settings" link on mobile
- Fallback to manual entry

## Implementation

### Build and Dependencies

- Install QR scanner library via npm (recommended: `qr-scanner`)
- Use Vite 7 for development (`npm run dev`) and production builds (`npm run build`)
- Build output goes to `site/` directory for GitHub Pages deployment
- Run tests with `npm test` (runs both Vitest unit tests and Playwright E2E tests)
- Import QR scanner library at the top of your component: `import jsQR from 'jsqr'` or use qr-scanner's provided API

### Camera Stream Setup

Create a Svelte component (e.g., `QrScanner.svelte`) that handles camera access:

```typescript
<script lang="ts">
  import { onMount } from 'svelte';

  let videoElement = $state<HTMLVideoElement>();
  let stream = $state<MediaStream | undefined>();
  let error = $state<string | undefined>();

  async function startCamera(): Promise<void> {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment', // Rear camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoElement) {
        videoElement.srcObject = stream;
        await videoElement.play();
        startScanning();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        error = 'Camera permission denied';
      } else {
        error = 'Camera not available';
      }
    }
  }

  onMount(() => {
    startCamera();
    return () => {
      // Cleanup on unmount
      stream?.getTracks().forEach((track) => track.stop());
    };
  });
</script>

<video bind:this={videoElement}></video>
{#if error}
  <p class="text-destructive">{error}</p>
{/if}
```

### Continuous Scanning Loop

Add to the QrScanner component:

```typescript
import jsQR from 'jsqr';

let scanning = $state(true);
let qrData = $state<string | undefined>();

function startScanning(): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  function tick(): void {
    if (!scanning || !videoElement?.videoWidth) {
      if (scanning) requestAnimationFrame(tick);
      return;
    }

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      qrData = code.data;
      scanning = false;
      return; // Stop scanning
    }

    requestAnimationFrame(tick);
  }

  tick();
}

// React to qrData changes
$effect(() => {
  if (qrData) {
    handleQRCodeDetected(qrData);
  }
});
```

### Form Auto-fill

Use Svelte component events to communicate scanned data to the parent form component:

```typescript
// In QrScanner.svelte
<script lang="ts">
  interface Props {
    onScan?: (data: OTPAuthData) => void;
    onError?: (error: string) => void;
    onClose?: () => void;
  }

  let { onScan, onError, onClose }: Props = $props();

  function handleQRCodeDetected(data: string): void {
    try {
      const parsed = parseOTPAuthURL(data);
      onScan?.(parsed);
    } catch (err) {
      onError?.('Invalid QR code format');
    }
  }
</script>

// In CreateForm.svelte (parent component)
<script lang="ts">
  let secret = $state('');
  let label = $state('');
  let digits = $state(6);
  let period = $state(30);
  let algorithm = $state('SHA1');
  let showScanner = $state(false);

  function handleScan(data: OTPAuthData) {
    secret = data.secret;
    label = data.label;
    digits = data.digits;
    period = data.period;
    algorithm = data.algorithm;
    showScanner = false;
    // Show toast notification using shadcn-svelte Toast component
  }
</script>

{#if showScanner}
  <QrScanner onScan={handleScan} onError={(err) => console.error(err)} onClose={() => showScanner = false} />
{/if}
```

### Cleanup

Cleanup is handled automatically by Svelte's lifecycle:

```typescript
// In QrScanner.svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let stream = $state<MediaStream | undefined>();
  let videoElement = $state<HTMLVideoElement>();

  onMount(() => {
    startCamera();

    // Cleanup function runs when component unmounts
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement) {
        // Note: srcObject requires null (DOM API), exception to undefined-over-null rule
        videoElement.srcObject = null;
      }
    };
  });
</script>
```

The cleanup function in `onMount` ensures the camera stream is stopped when:
- Component is unmounted (modal closed)
- User navigates away
- QR code is successfully scanned and component is removed

## Error Handling

### Permission Denied

- Show clear message with instructions
- Provide "Try Again" button
- Link to browser help for permissions

### No Camera Available

- Desktop without webcam: Hide scan button
- Mobile: Should never happen, show error

### Invalid QR Code

- Not an otpauth:// URL: "This is not a TOTP QR code"
- Malformed URL: "Invalid QR code format"
- Missing secret: "QR code missing required secret"

### Camera Errors

- Camera in use by another app: "Camera unavailable"
- Hardware error: "Camera access failed"

## Security Considerations

### Privacy

- Camera access only when scanning
- Stop stream immediately after scan
- No video/image recording or storage
- Clear permission prompt before camera access

### Validation

- Verify otpauth:// protocol
- Validate Base32 secret format
- Sanitize label and issuer (XSS prevention)

### Phishing Prevention

- Display issuer prominently after scan
- Warn if issuer doesn't match expected service
- Example: Scanning "Google" QR on "Facebook" setup page

## Testing Requirements

Use **Vitest** for unit tests (e.g., OTP URL parsing) and **Playwright** for E2E UI tests (camera access, QR scanning).

### tests/qr-scan.spec.ts

**Mock camera access:**

```javascript
test('should request camera permission', async ({ page }) => {
  await page.goto('/');
  await page.grantPermissions(['camera']);
  await page.click('[data-testid="scan-qr-button"]');
  // Verify camera modal opens
});
```

**Mock QR code detection:**

- Generate test QR codes with known values
- Inject mock getUserMedia stream
- Verify form auto-fill with correct values

**Test cases:**

- Valid TOTP QR code → Fields populated correctly
- Invalid QR code (wrong format) → Error shown
- Permission denied → Error message displayed
- Cancel during scan → Stream stopped, modal closed
- Multiple QR codes in view → First valid code used

### tests/otpauth-parser.spec.ts

Test URL parsing with various formats:

```typescript
import { test, expect } from '@playwright/test';

test('parse standard otpauth URL', () => {
  const url = 'otpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub';
  const result = parseOTPAuthURL(url);
  expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
  expect(result.label).toBe('GitHub:user@example.com');
  expect(result.issuer).toBe('GitHub');
});

test('parse URL with custom parameters', () => {
  const url = 'otpauth://totp/Service?secret=ABC&algorithm=SHA256&digits=8&period=60';
  const result = parseOTPAuthURL(url);
  expect(result.algorithm).toBe('SHA256');
  expect(result.digits).toBe(8);
  expect(result.period).toBe(60);
});

test('reject invalid protocol', () => {
  const url = 'https://example.com/qr';
  expect(() => parseOTPAuthURL(url)).toThrow();
});
```

### tests/camera-ui.spec.ts

- Modal opens on scan button click
- Modal closes on cancel
- Modal closes after successful scan
- Camera stream stops on close
- Front/back camera toggle (mobile)

### Manual Testing

**Test with real services:**

1. GitHub 2FA setup → Scan QR → Verify works
2. Google Account 2FA → Scan QR → Verify works
3. AWS Console → Scan QR → Verify works
4. Discord → Scan QR → Verify works

**Browser compatibility:**

- Chrome/Edge (desktop + mobile)
- Firefox (desktop + mobile)
- Safari (desktop + iOS)

## Accessibility

### Screen Reader Support

- Announce camera modal open/close
- Announce scan success/failure
- Keyboard navigation for cancel button

### Keyboard Users

- Escape key to close modal
- Tab to cancel button
- Enter on scan button opens modal

## Performance

### Video Processing

- Target 10-15 FPS for scanning (balance accuracy vs CPU)
- Reduce canvas resolution if device struggles
- Pause other animations during scan

### Library Size

- jsQR: ~30KB (simple, reliable)
- qr-scanner: ~15KB (faster, more complex)
- Choose based on performance testing

## Success Criteria

Phase 3 is complete when:

- [ ] Scan button opens camera modal
- [ ] Camera stream displays in preview
- [ ] QR codes detected and parsed correctly
- [ ] Form auto-fills from scanned data
- [ ] Works on desktop and mobile
- [ ] All tests pass
- [ ] Manual testing with real TOTP QR codes succeeds
- [ ] Graceful degradation if camera unavailable
- [ ] Privacy: No data leaves device
- [ ] All code is checked for duplication and refactoring is done to ensure no duplication exists
- [ ] All unnecessary comments are removed, code should be self-documenting
