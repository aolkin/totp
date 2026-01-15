# Offline Enhancement: Better Offline UX Without Install

## Overview

Improve the offline experience for users who don't install the PWA, making it clear that the app works offline and providing better cache management.

**Current State (Phase 1):**
- Service worker caches files
- Works offline after first visit
- No user feedback about offline status
- No cache persistence guarantees

**Enhanced State:**
- Clear offline status indicators
- Persistent storage request
- Cache age display
- Manual cache refresh option
- Offline readiness notification

## Features to Add

### 1. Offline Status Banner

**On Service Worker Activation (first time only):**

Show dismissible banner at top of page:
```
┌─────────────────────────────────────┐
│ ✓ App Ready for Offline Use         │
│                                      │
│ This app now works without internet │
│ connection. Your TOTPs are always   │
│ available, even offline.            │
│                                      │
│ [Got It] [Install for Best Experience]
└─────────────────────────────────────┘
```

**Implementation:**
- Show once per browser (store dismissed state in localStorage)
- Auto-hide after 10 seconds if not interacted with
- "Install" button triggers PWA install prompt
- Green checkmark icon for positive framing

### 2. Connection Status Indicator

**Top-right corner badge:**
```
Online mode:  ● Online
Offline mode: ○ Offline
```

**Visual design:**
- Small, unobtrusive (10px circle + text)
- Green dot when online
- Gray dot when offline
- Tooltip on hover: "All features work offline"

**Implementation:**
```javascript
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);

function updateStatus() {
  const isOnline = navigator.onLine;
  statusBadge.className = isOnline ? 'online' : 'offline';
  statusBadge.textContent = isOnline ? '● Online' : '○ Offline';
}
```

### 3. Persistent Storage Request

**On first visit after service worker activated:**

Request persistent storage to prevent cache eviction:
```javascript
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    
    if (isPersisted) {
      console.log('Storage persistence granted');
      localStorage.setItem('storage_persisted', 'true');
    } else {
      console.log('Storage may be cleared by browser');
      // Show optional warning
    }
  }
}
```

**User prompt (if browser shows permission):**
- Most browsers grant silently
- Chrome may show: "Allow [site] to store data on this device?"
- We explain beforehand with banner

**Fallback for browsers without API:**
- Just rely on service worker cache
- Show "Install app for guaranteed storage" suggestion

### 4. Cache Information Panel

**In settings/about section:**
```
┌─────────────────────────────────────┐
│ Offline Status                      │
├─────────────────────────────────────┤
│ ✓ App cached for offline use        │
│ Cached: 2 days ago                  │
│ Cache size: ~45 KB                  │
│ Storage: Persistent ✓               │
│                                      │
│ [Refresh Cache] [Clear Cache]       │
└─────────────────────────────────────┘
```

**Details shown:**
- Cache status (ready/not ready)
- Last cache update time
- Approximate size
- Persistence status
- Manual controls

**Implementation:**
```javascript
async function getCacheInfo() {
  const cache = await caches.open('totp-v1');
  const keys = await cache.keys();
  
  const sizes = await Promise.all(
    keys.map(async req => {
      const response = await cache.match(req);
      const blob = await response.blob();
      return blob.size;
    })
  );
  
  const totalSize = sizes.reduce((a, b) => a + b, 0);
  const lastUpdate = localStorage.getItem('cache_last_update');
  
  return { totalSize, lastUpdate, itemCount: keys.length };
}
```

### 5. Manual Cache Refresh

**"Refresh Cache" button functionality:**

Force service worker to update cache immediately:
```javascript
async function refreshCache() {
  const registration = await navigator.serviceWorker.getRegistration();
  
  if (registration) {
    await registration.update();
    localStorage.setItem('cache_last_update', Date.now());
    showToast('Cache refreshed successfully');
  }
}
```

**Use cases:**
- User knows there's an update
- Periodic manual refresh (monthly?)
- Before going offline for extended period

### 6. Clear Cache Option

**"Clear Cache" button:**

Removes all cached resources:
```javascript
async function clearCache() {
  const confirmed = confirm(
    'Clear cache? App will require internet on next visit.'
  );
  
  if (confirmed) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
    
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
    }
    
    showToast('Cache cleared. Reload page to re-cache.');
  }
}
```

**When needed:**
- Troubleshooting issues
- Freeing storage space
- Starting fresh

### 7. Storage Quota Display

**Show available storage:**
```
Storage: 42 KB used of 50 MB available
```

**Implementation:**
```javascript
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage / estimate.quota) * 100;
  
  displayQuota({
    used: formatBytes(estimate.usage),
    total: formatBytes(estimate.quota),
    percent: percentUsed.toFixed(2)
  });
}
```

### 8. Offline Detection on TOTP View

**When viewing TOTP while offline:**

Show reassurance message:
```
┌─────────────────────────────────────┐
│ ○ Offline                           │
│ Your codes work without internet    │
└─────────────────────────────────────┘

       123 456
     (refreshes in 18s)
```

This reduces anxiety about "is this working?"

### 9. Update Available Notification

**When new version detected:**

Show banner:
```
┌─────────────────────────────────────┐
│ 🔄 Update Available                 │
│ New version with improvements       │
│ [Update Now] [Later]                │
└─────────────────────────────────────┘
```

**Service worker implementation:**
```javascript
self.addEventListener('activate', event => {
  // New service worker activated
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_AVAILABLE'
      });
    });
  });
});
```

**Client side:**
```javascript
navigator.serviceWorker.addEventListener('message', event => {
  if (event.data.type === 'UPDATE_AVAILABLE') {
    showUpdateBanner();
  }
});

function applyUpdate() {
  window.location.reload();
}
```

### 10. First-Time Offline Experience

**Educational modal on first offline usage:**
```
┌─────────────────────────────────────┐
│ You're Offline!                     │
│                                      │
│ Don't worry - all your TOTPs still  │
│ work perfectly. This app is fully   │
│ functional without internet.        │
│                                      │
│ ✓ Generate codes                    │
│ ✓ View saved TOTPs (Phase 2)        │
│ ✓ Create new TOTPs                  │
│                                      │
│ [x] Don't show again    [Got It!]   │
└─────────────────────────────────────┘
```

Show once when offline state first detected.

## UI Location

**Status indicator:** Top-right corner (persistent)
**Offline banner:** Top of page (dismissible, first-time only)
**Cache info:** Settings or About page
**Update notification:** Top of page (when update available)

## Service Worker Enhancements

### Add Version Tracking

```javascript
const CACHE_VERSION = 'v1.0.5';
const CACHE_NAME = `totp-cache-${CACHE_VERSION}`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        'https://cdn.jsdelivr.net/npm/otpauth@9/dist/otpauth.umd.min.js'
      ]);
    })
  );
});
```

### Smart Cache Strategy

**Network-first for HTML (get updates):**
```javascript
self.addEventListener('fetch', event => {
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
```

**Cache-first for assets (performance):**
```javascript
if (event.request.destination === 'script' || 
    event.request.destination === 'style') {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
}
```

## Testing Requirements

### tests/offline.spec.js

```javascript
test('shows offline ready banner after service worker activation', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="offline-ready-banner"]');
  expect(await page.textContent('.banner')).toContain('Ready for Offline');
});

test('status indicator shows offline when disconnected', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.waitForSelector('.status-badge.offline');
  expect(await page.textContent('.status-badge')).toContain('Offline');
});

test('app works offline for TOTP generation', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Go offline
  await context.setOffline(true);
  
  // Create TOTP
  await page.fill('#secret', 'JBSWY3DPEHPK3PXP');
  await page.click('[data-testid="generate-button"]');
  
  // Verify code generated
  const code = await page.textContent('[data-testid="totp-code"]');
  expect(code).toMatch(/^\d{6}$/);
});

test('cache refresh updates service worker', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="refresh-cache-button"]');
  await page.waitForSelector('.toast:has-text("Cache refreshed")');
});

test('storage quota displays correctly', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="settings-button"]');
  const quota = await page.textContent('[data-testid="storage-quota"]');
  expect(quota).toMatch(/\d+\s*(KB|MB)\s*used/);
});
```

### Manual Testing Checklist

- [ ] First visit shows offline ready banner
- [ ] Status indicator changes online ↔ offline
- [ ] App works fully offline (create, view TOTPs)
- [ ] Cache refresh updates successfully
- [ ] Clear cache removes all data
- [ ] Storage quota displays accurate info
- [ ] Update notification appears on new version
- [ ] Persistent storage granted (check dev tools)
- [ ] Works in incognito/private mode
- [ ] Test on mobile (iOS Safari, Android Chrome)

## Browser Compatibility

**Full support:**
- Chrome 67+ (desktop/Android)
- Edge 79+
- Firefox 87+
- Safari 14+ (macOS/iOS)

**Partial support:**
- Safari 11-13: No persistent storage API
- Firefox 44-86: Limited service worker features

**Graceful degradation:**
- Older browsers: App still works, just always requires internet
- Show warning: "For offline use, update your browser"

## Success Criteria

Enhancement is complete when:
- [ ] Offline status clearly communicated to users
- [ ] Persistent storage requested on first visit
- [ ] Cache info panel shows accurate data
- [ ] Manual cache refresh works
- [ ] Update notifications appear correctly
- [ ] App fully functional offline (verified via tests)
- [ ] Works without requiring install
- [ ] All Playwright tests pass
- [ ] Tested across browsers/devices

## User Benefits

**Without this enhancement:**
- Users don't know app works offline
- May avoid using app when offline
- No control over cache
- Updates happen silently (confusing)

**With this enhancement:**
- Clear offline capability communication
- Confidence to use app anywhere
- Control over storage/updates
- Better long-term cache persistence
- Educational first-time experience
