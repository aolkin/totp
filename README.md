# TOTP Authenticator

A fully client-side, stateless TOTP (Time-based One-Time Password) authenticator Progressive Web App.

## Features

- **Zero Server Trust**: All encryption happens client-side. TOTP secrets are encrypted and embedded in the URL fragment, which never reaches the server.
- **Passphrase Protection**: Optional passphrase encryption using PBKDF2 + AES-256-GCM.
- **PWA Support**: Install as an app on mobile or desktop, works offline after first load.
- **No Dependencies on Server Storage**: Your secrets exist only in the URL you save.

## How It Works

1. **Create Mode**: Enter your TOTP secret and optionally set a passphrase. The app generates an encrypted URL.
2. **View Mode**: Open the URL to view your TOTP code. If passphrase-protected, you'll be prompted to enter it.

## Security

- **Encryption**: AES-256-GCM with PBKDF2-SHA256 key derivation (100,000 iterations)
- **URL Fragment**: Everything after `#` in the URL never reaches the server
- **Passphrase**: Auto-generated 5-word phrase or custom (minimum 12 characters)

## Project Structure

- `site/` - GitHub Pages site content (the PWA)
- `tasks/` - Work items and development phases
- All other files (README, LICENSE, etc.) remain private and are not published to the site

## Development

The application is a single-page PWA with no build step required. Simply serve the `site/` directory:

```bash
cd site
python -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Deployment

The `site/` directory is automatically deployed to GitHub Pages on push to main.
