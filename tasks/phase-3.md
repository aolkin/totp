# Phase 3: QR Code Scanning

## Overview

Add camera-based QR code scanning to the create form, allowing users to scan TOTP QR codes directly instead of manually entering Base32 secrets.

**Goal:** Match the UX of mobile authenticator apps (Google Authenticator, Authy, etc.)

## Technical Requirements

### Dependencies

Add QR code library via CDN:
- **jsQR** (~30KB) - Pure JavaScript QR decoder
  - CDN: https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js (make sure to use the latest stable version)
  
Alternative: **qr-scanner** (~15KB, better performance)
  - CDN: https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js (use the latest stable version of this unless there's a really good reason not to)

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
    period: parseInt(params.get('period') || '30') || 30
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

### Camera Stream Setup

```typescript
async function startCamera(): Promise<void> {
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: 'environment', // Rear camera on mobile
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    await videoElement.play();
    startScanning();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      showError('Camera permission denied');
    } else {
      showError('Camera not available');
    }
  }
}
```

### Continuous Scanning Loop

```typescript
function startScanning(): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  function tick(): void {
    if (!videoElement.videoWidth) {
      requestAnimationFrame(tick);
      return;
    }

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      handleQRCodeDetected(code.data);
      return; // Stop scanning
    }

    requestAnimationFrame(tick);
  }

  tick();
}
```

### Form Auto-fill

```typescript
function handleQRCodeDetected(data: string): void {
  try {
    const parsed = parseOTPAuthURL(data);

    // Fill form fields
    const secretInput = document.getElementById('secret') as HTMLInputElement;
    const labelInput = document.getElementById('label') as HTMLInputElement;
    const digitsInput = document.getElementById('digits') as HTMLSelectElement;
    const periodInput = document.getElementById('period') as HTMLInputElement;
    const algorithmInput = document.getElementById('algorithm') as HTMLSelectElement;

    if (secretInput) secretInput.value = parsed.secret;
    if (labelInput) labelInput.value = parsed.label;
    if (digitsInput) digitsInput.value = parsed.digits.toString();
    if (periodInput) periodInput.value = parsed.period.toString();
    if (algorithmInput) algorithmInput.value = parsed.algorithm;

    // Show success
    showToast('QR code scanned successfully!');
    closeCameraModal();
  } catch (error) {
    showError('Invalid QR code format');
  }
}
```

### Cleanup

```typescript
function stopCamera(): void {
  const stream = videoElement.srcObject as MediaStream | null;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    // Note: srcObject requires null (DOM API), exception to undefined-over-null rule
    videoElement.srcObject = null;
  }
}

// Call on modal close or successful scan
```

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
