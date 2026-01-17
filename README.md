# totp
A fully client-side browser-based TOTP generator

## Features

- 🔒 Client-side encryption (AES-256-GCM)
- 🔑 Stateless architecture (secrets in URL)
- 📱 Progressive Web App with offline support
- 🌐 Works without internet after first load
- 🎨 Modern UI with Tailwind CSS and shadcn-svelte

## Tech Stack

- **Framework:** Svelte 5 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with shadcn-svelte component library
- **Deployment:** GitHub Pages
- **PWA:** Service Worker with offline-first caching

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
