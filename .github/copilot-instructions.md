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
- **Styling**: Tailwind CSS v3 with shadcn-svelte component library
- **PWA**: vite-plugin-pwa with Workbox for service worker management
- **Testing**: Playwright (end-to-end tests)
- **Type Checking**: svelte-check with TypeScript
- **Deployment**: GitHub Pages (builds to `site/` directory)
- **Code Quality**: ESLint v9 (flat config), Prettier, Husky v9 pre-commit hooks

## Build, Test, and Development Commands

```bash
# Development server (runs on http://localhost:5173)
npm run dev

# Production build (outputs to site/)
npm run build

# Preview production build
npm run preview

# Run all tests (unit + E2E)
npm test

# Run only unit tests (Vitest)
npm run test:unit

# Watch mode for unit tests
npm run test:unit:watch

# Run only E2E tests (Playwright)
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug

# Type checking
npm run check

# Linting
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues

# Formatting
npm run format        # Format all files with Prettier
npm run format:check  # Check if files are formatted correctly
```

## Project Structure

```
├── src/
│   ├── components/         # Svelte components
│   ├── lib/
│   │   ├── components/ui/  # shadcn-svelte UI components
│   │   ├── utils/          # Utility functions (including cn for Tailwind)
│   │   ├── crypto.ts       # Encryption/decryption, URL encoding
│   │   ├── totp.ts         # TOTP generation logic
│   │   ├── passphrase.ts   # Passphrase generation
│   │   └── types.ts        # TypeScript type definitions
│   ├── App.svelte          # Root component
│   ├── app.css             # Global styles and Tailwind directives
│   ├── main.ts             # Application entry point
│   └── service-worker.ts   # PWA service worker
├── public/                 # Static assets
├── site/                   # Build output (GitHub Pages deployment, gitignored)
├── tasks/                  # Work items and todos
├── tailwind.config.js      # Tailwind configuration
└── components.json         # shadcn-svelte configuration
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

### Tailwind CSS Guidelines

- Use Tailwind utility classes for styling
- Use the `cn()` utility from `$lib/utils` to merge class names with tailwind-merge
- Follow shadcn-svelte patterns for component composition
- Prefer Tailwind utilities over custom CSS when possible
- Use CSS variables for theme colors (defined in `app.css`)

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings (unless interpolation needed)
- **Semicolons**: Use semicolons
- **Line length**: Keep lines reasonable (aim for <100 chars when practical)
- **Comments**: Only add comments when necessary to explain complex logic. Code should be self-documenting when possible.

### Code Quality Tools

This project uses modern code quality tools to maintain consistency:

- **ESLint v9**: Configured with flat config format (`eslint.config.js`)
  - TypeScript ESLint for type-aware linting
  - Svelte ESLint plugin for Svelte-specific rules
  - Integrated with Prettier to avoid conflicts
  - Run with `npm run lint` or auto-fix with `npm run lint:fix`

- **Prettier v3**: Automatic code formatting
  - Configured in `.prettierrc`
  - Includes Svelte plugin for `.svelte` files
  - Run with `npm run format` or check with `npm run format:check`

- **Pre-commit Hooks**: Husky v9 + lint-staged
  - Automatically runs on staged files before commit
  - Runs ESLint with auto-fix and Prettier formatting
  - Configuration in `package.json` under `lint-staged`

- **GitHub Actions**: Automated PR validation (`.github/workflows/pr-validation.yml`)
  - Runs linting, formatting checks, type checking, build, and tests
  - Ensures all PRs meet quality standards before merging

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

All types are defined in `src/lib/types.ts`. Refer to that file for the canonical type definitions including `TOTPConfig`, `TOTPMetadata`, `EncryptedData`, and default constants.

## Testing Guidelines

### Testing Philosophy

**Focus on testing our code, not library code.** Unit tests should verify our own logic and integration points, not re-test functionality provided by third-party libraries (like `otpauth` for TOTP generation or Web Crypto API for encryption).

- ✅ Test our encryption/decryption roundtrip logic
- ✅ Test our passphrase generation logic
- ✅ Test our time remaining calculation
- ✅ Test user-facing flows via E2E tests
- ❌ Don't test that TOTP algorithms produce correct codes (that's testing `otpauth`)
- ❌ Don't test simple lookup functions in isolation (test them via E2E flows)

### Test Structure

- **Unit tests** (`src/lib/__tests__/`): Vitest tests for our core logic
- **E2E tests** (`tests/`): Playwright tests for user-facing functionality

### Writing Tests

- Write tests that verify user-facing functionality
- Test both happy paths and error cases
- Always test encryption/decryption round trips
- Prefer fewer, higher-value tests over many granular tests
- Consolidate related assertions into single tests when logical

## Common Tasks

### Adding a new component

1. Create `.svelte` file in `src/components/`
2. Use PascalCase naming
3. Use Svelte 5 runes (`$state`, `$props`, `$derived`)
4. Use TypeScript with proper types
5. Style with Tailwind CSS utility classes
6. Leverage shadcn-svelte UI components from `$lib/components/ui/` when appropriate
7. Use the `cn()` utility to merge conditional classes

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
2. **Lint and format**: Run `npm run lint:fix` and `npm run format` before committing
3. **Type check**: Run `npm run check` to ensure TypeScript types are correct
4. **Test your changes**: Run `npm run build` and `npm test` before submitting
5. **Preserve functionality**: Don't break existing features
6. **Review git diff**: Ensure only intended changes are included

Note: Pre-commit hooks will automatically lint and format staged files, but it's good practice to run these commands manually during development.

## PWA and Service Worker

- PWA functionality is managed by `vite-plugin-pwa` using the `injectManifest` strategy
- Service worker source is `src/service-worker.ts` and uses Workbox for caching
- The service worker is built and injected automatically during the Vite build process
- Offline-first caching strategy ensures the app works without internet
- Don't modify PWA configuration without understanding the offline implications

## Documentation

- Update README.md if you change user-facing functionality
- Document complex algorithms or security-critical code
- Keep documentation concise and accurate
- Use markdown for all documentation files
