# Offline Enhancement: Better Offline UX Without Install

## Overview

Improve the offline experience for users who don't install the PWA, making it clear that the app works offline and providing better cache management.

**Current State (Phase 1 - Basic Caching Implemented):**
- ✅ Service worker caches files
- ✅ Works offline after first visit
- ❌ No user feedback about offline status (enhancement pending)
- ❌ No cache persistence guarantees (enhancement pending)

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


### 3. Persistent Storage Request

**On first visit after service worker activated:**

Request persistent storage to prevent cache eviction:
```typescript
async function requestPersistentStorage(): Promise<void> {
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
```typescript
interface CacheInfo {
  totalSize: number;
  lastUpdate: string | undefined;
  itemCount: number;
}

async function getCacheInfo(): Promise<CacheInfo> {
  const cache = await caches.open('totp-v1');
  const keys = await cache.keys();

  const sizes = await Promise.all(
    keys.map(async (req) => {
      const response = await cache.match(req);
      if (!response) return 0;
      const blob = await response.blob();
      return blob.size;
    })
  );

  const totalSize = sizes.reduce((a, b) => a + b, 0);
  const lastUpdate = localStorage.getItem('cache_last_update');

  return { totalSize, lastUpdate, itemCount: keys.length };
}
```

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
```typescript
self.addEventListener('activate', (event: ExtendableEvent) => {
  // New service worker activated
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE'
        });
      });
    })
  );
});
```

**Client side:**
```typescript
navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
  if (event.data.type === 'UPDATE_AVAILABLE') {
    showUpdateBanner();
  }
});

function applyUpdate(): void {
  window.location.reload();
}
```

## UI Location

**Status indicator:** Top-right corner (persistent)
**Offline banner:** Top of page (dismissible, first-time only)
**Cache info:** Settings or About page
**Update notification:** Top of page (when update available)

## Service Worker Enhancements

### Add Version Tracking

```typescript
const CACHE_VERSION = 'v1.0.5';
const CACHE_NAME = `totp-cache-${CACHE_VERSION}`;

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/index.js',  // Vite build output
        '/assets/index.css'  // Vite build output
      ]);
    })
  );
});
```

### Smart Cache Strategy

**Network-first for HTML (get updates):**
```typescript
self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match(event.request) as Promise<Response>)
    );
  }
});
```

**Cache-first for assets (performance):**
```typescript
if (event.request.destination === 'script' ||
    event.request.destination === 'style') {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
}
```


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
- [ ] Persistent storage requested on first visit
- [ ] Update notifications appear correctly
- [ ] App fully functional offline (verified via tests)
- [ ] Works without requiring install
- [ ] All Playwright tests pass
- [ ] Tested across browsers/devices

