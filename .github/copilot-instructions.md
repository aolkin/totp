# GitHub Copilot Instructions for TOTP Project

## Project Overview

This is a **fully client-side browser-based TOTP (Time-based One-Time Password) generator** built as a Progressive Web App. The application features:

- 🔒 Client-side AES-256-GCM encryption
- 🔑 Stateless architecture with secrets stored in URL fragments
- 📱 PWA with offline support via service worker
- 🌐 Works without internet after first load

## Tech Stack

- **Frontend Framework**: Svelte 5 (with runes API: `$state`, `$derived`, etc.)
- **Language**: TypeScript (strict mode enabled)
- **Build Tool**: Vite 7
- **Testing**: Playwright (end-to-end tests)
- **Type Checking**: svelte-check with TypeScript
- **Deployment**: GitHub Pages (builds to `site/` directory)

## Build, Test, and Development Commands

```bash
# Development server (runs on http://localhost:5173)
npm run dev

# Production build (outputs to site/)
npm run build

# Preview production build
npm run preview

# Run Playwright tests
npm test

# Run Playwright tests in headed mode
npm run test:headed

# Debug Playwright tests
npm run test:debug

# Type checking
npm run check
```

## Project Structure

```
├── src/
│   ├── components/         # Svelte components
│   ├── lib/               # Core utilities and business logic
│   │   ├── crypto.ts      # Encryption/decryption, URL encoding
│   │   ├── totp.ts        # TOTP generation logic
│   │   ├── passphrase.ts  # Passphrase generation
│   │   └── types.ts       # TypeScript type definitions
│   ├── App.svelte         # Root component
│   ├── main.ts            # Application entry point
│   └── service-worker.ts  # PWA service worker
├── public/                # Static assets
├── site/                  # Build output (GitHub Pages deployment, gitignored)
└── tasks/                 # Work items and todos
```

## Coding Standards

### ✅ MANDATORY: Use `undefined` over `null`

**Always use `undefined` for absent values. Never use `null` except when required by external APIs (DOM, Web Crypto API, etc.).**

This is the most important coding standard in this project. TypeScript's natural "no value" is `undefined`. Using both `null` and `undefined` creates unnecessary complexity.

```typescript
// ✅ Good
let value: string | undefined;
function find(): User | undefined { 
  return undefined; // or omit return statement
}
const result = data?.optionalField; // undefined if not present

// ❌ Bad
let value: string | null = null;
function find(): User | null { 
  return null; 
}
```

### TypeScript Guidelines

- **Strict mode is enabled** - all strict TypeScript checks are enforced
- Use explicit types for function parameters and return values
- Prefer `interface` for object shapes, `type` for unions/intersections
- Enable all recommended TypeScript compiler options:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`

### Svelte 5 Guidelines

- Use Svelte 5 runes API: `$state`, `$derived`, `$effect`, `$props`
- Component props should use the `$props()` rune
- Reactive state should use `$state` (not `let` with `$:`)
- Derived values should use `$derived` (not `$:` reactive statements)

```typescript
// ✅ Good - Svelte 5 runes
let count = $state(0);
let doubled = $derived(count * 2);

// ❌ Bad - Old Svelte syntax (avoid)
let count = 0;
$: doubled = count * 2;
```

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings (unless interpolation needed)
- **Semicolons**: Use semicolons
- **Line length**: Keep lines reasonable (aim for <100 chars when practical)
- **Comments**: Only add comments when necessary to explain complex logic. Code should be self-documenting when possible.

### Naming Conventions

- **Files**: kebab-case for all files (`totp-display.ts`, `create-form.svelte`)
- **Components**: PascalCase (`CreateForm.svelte`, `TotpDisplay.svelte`)
- **Variables/Functions**: camelCase (`handleUnlock`, `encryptedData`)
- **Types/Interfaces**: PascalCase (`TOTPConfig`, `EncryptedData`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_DIGITS`, `PBKDF2_ITERATIONS`)

## Security Guidelines

### Critical Security Requirements

1. **Never commit secrets or API keys** to the repository
2. **Client-side only**: All cryptographic operations happen in the browser
3. **No server-side storage**: Secrets are encrypted and stored in URL fragments only
4. **Use Web Crypto API**: Always use `crypto.subtle` for cryptographic operations
5. **No external API calls**: Application must work fully offline

### Encryption Standards

- **Algorithm**: AES-256-GCM for encryption
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Secure random**: Use `crypto.getRandomValues()` for all random data generation

### Input Validation

- Validate and sanitize all user inputs
- Use TypeScript types to enforce data structure requirements
- Validate Base32 secrets before use: `/^[A-Z2-7]+=*$/`

## Architecture Patterns

### Stateless Design

The application is stateless by design:
- No cookies, localStorage, or sessionStorage for secrets
- All TOTP configuration is encrypted and encoded in the URL hash
- Passphrase (if any) is only held in memory during the session

### URL Fragment Structure

```
https://example.com/#<base64url-encoded-encrypted-data>

The encrypted data contains:
- Salt (16 bytes)
- IV (12 bytes)  
- Ciphertext (variable length)
```

### Optional Passphrase

- Empty passphrase ("") = no passphrase protection
- The application first attempts to decrypt with empty passphrase
- If that fails, prompts user for passphrase

## Working with Types

All types are defined in `src/lib/types.ts`. Key interfaces:

```typescript
interface TOTPConfig {
  secret: string;      // Base32-encoded secret
  label: string;       // Display label
  digits: number;      // Code length (typically 6)
  period: number;      // Refresh period in seconds (typically 30)
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
}

interface EncryptedData {
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}
```

## Testing Guidelines

- Tests are located in `tests/` directory (Playwright e2e tests)
- Write tests that verify user-facing functionality
- Test both happy paths and error cases
- Always test encryption/decryption round trips
- Verify PWA offline functionality

## Common Tasks

### Adding a new component

1. Create `.svelte` file in `src/components/`
2. Use PascalCase naming
3. Use Svelte 5 runes (`$state`, `$props`, `$derived`)
4. Use TypeScript with proper types
5. Follow the project's code style

### Adding a new utility function

1. Add to appropriate file in `src/lib/`
2. Export the function
3. Add TypeScript types for parameters and return value
4. Consider if it needs tests

### Modifying encryption logic

1. **Be extremely careful** - encryption is security-critical
2. Test thoroughly with various inputs
3. Ensure backward compatibility with existing encrypted URLs
4. Never weaken security parameters

## Things to Avoid

- ❌ Don't use `null` - use `undefined` instead
- ❌ Don't add server-side code or APIs
- ❌ Don't store secrets in localStorage or cookies
- ❌ Don't add dependencies without good reason (keep bundle size small)
- ❌ Don't use old Svelte syntax (avoid `$:` reactive statements, use runes)
- ❌ Don't commit the `site/` build directory
- ❌ Don't modify `.gitignore` to commit build artifacts
- ❌ Don't add analytics or tracking that could compromise privacy

## File Modifications

When making changes:

1. **Minimal changes**: Only modify what's necessary to address the issue
2. **Test your changes**: Run `npm run build` and `npm test` before submitting
3. **Type check**: Run `npm run check` to ensure TypeScript types are correct
4. **Preserve functionality**: Don't break existing features
5. **Review git diff**: Ensure only intended changes are included

## PWA and Service Worker

- Service worker is built as part of the Vite build process
- Cache version is auto-generated based on file hashes
- Static assets list is injected at build time
- Service worker enables offline functionality - don't break it!

## Documentation

- Update README.md if you change user-facing functionality
- Document complex algorithms or security-critical code
- Keep documentation concise and accurate
- Use markdown for all documentation files
