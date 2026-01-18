# totp

A fully client-side browser-based TOTP generator

## Features

- 🔒 Client-side encryption (AES-256-GCM)
- 🔑 Stateless architecture (secrets in URL)
- 💾 Optional browser storage (IndexedDB) for saved TOTPs
- 📱 Progressive Web App with offline support
- 🌐 Works without internet after first load
- 🎨 Modern UI with Tailwind CSS and shadcn-svelte
- ⚙️ Cache management and offline status indicator
- 🔄 Automatic update notifications
- 📤 Export/Import backup functionality

## How It Works

### Stateless Mode (URL-based)

TOTP secrets are encrypted client-side and embedded in the URL fragment. No server storage required. Share URLs with team members who have the passphrase.

### Persistent Mode (Browser Storage)

Optionally save TOTPs to your browser's IndexedDB:

- **Save to Browser:** Check "Save to this browser" when creating a TOTP
- **List View:** Access all saved TOTPs from the root URL
- **Passphrase Hints:** Add optional hints to help remember passphrases
- **Session Caching:** Passphrases are cached in session storage to avoid re-entering
- **Export/Import:** Backup and restore your TOTPs as JSON files

**Note:** Browser storage is local only - no cloud sync. Clearing browser data will delete saved TOTPs.

## Offline Support

This app is designed to work fully offline after the first visit:

- **First Visit:** Service worker caches the entire app for offline use
- **Offline Ready Banner:** Shows once to confirm the app works offline
- **Persistent Storage:** Automatically requests persistent storage to prevent cache eviction
- **Cache Information:** View cache status, size, and age via settings (⚙️ icon)
- **Update Notifications:** Get notified when a new version is available
- **Manual Controls:** Refresh or clear cache via the settings panel

The app can optionally be installed as a PWA for the best experience, but installation is not required for offline functionality.

## Tech Stack

- **Framework:** Svelte 5 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with shadcn-svelte component library
- **Deployment:** GitHub Pages
- **PWA:** Service Worker with offline-first caching
- **Code Quality:** ESLint, Prettier, Husky pre-commit hooks

## Development

### Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run all tests (unit + E2E)
npm test

# Run only unit tests
npm run test:unit

# Run only E2E tests
npm run test:e2e

# Type checking
npm run check

# Linting
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues

# Formatting
npm run format        # Format all files
npm run format:check  # Check formatting
```

### Code Quality

This project uses:

- **ESLint** with TypeScript and Svelte support for linting
- **Prettier** for consistent code formatting
- **Husky + lint-staged** for pre-commit hooks that automatically lint and format staged files
- **GitHub Actions** for automated PR validation

Pre-commit hooks will automatically run linting and formatting on your staged files before each commit.

### Testing Philosophy

Tests focus on **our code, not library code**. Unit tests verify our own logic; they don't re-test third-party libraries (like `otpauth` for TOTP or Web Crypto API).

- Unit tests (`src/lib/__tests__/`) use Vitest for fast, isolated testing of core logic
- E2E tests (`tests/`) use Playwright for user-facing functionality
- Prefer fewer, higher-value tests over many granular tests

## **MANDATORY: Coding Standards**

### Use `undefined` over `null`

**Always use `undefined` for absent values. Never use `null` except when required by external APIs (DOM, etc.).**

Why: TypeScript's natural "no value" is `undefined`. Using both `null` and `undefined` creates unnecessary complexity.

```typescript
// ✅ Good
let value: string | undefined;
function find(): User | undefined { ... }

// ❌ Bad
let value: string | null = null;
function find(): User | null { ... }
```

## Project Structure

- `site/` - GitHub Pages site content
- `tasks/` - Work items and todos.
- All other files (README, LICENSE, etc.) remain private and are not published to the site
