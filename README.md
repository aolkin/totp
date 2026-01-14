# totp
A fully client-side browser-based TOTP generator

## Project Structure

- `site/` - GitHub Pages site content (publicly accessible at totp.starmaze.dev)
- All other files (README, LICENSE, etc.) remain private and are not published to the site

## GitHub Pages Setup (TO BE REMOVED AFTER SETUP IS COMPLETE)

To set up GitHub Pages for this repository to be hosted at `totp.starmaze.dev`:

1. Go to the repository **Settings** tab
2. Navigate to **Pages** in the left sidebar
3. Under **Source**, select "GitHub Actions" as the build and deployment source
4. Under **Custom domain**, enter `totp.starmaze.dev`
5. Check "Enforce HTTPS" once DNS is configured
6. Configure DNS for `totp.starmaze.dev`:
   - Add a CNAME record pointing to `aolkin.github.io`
   - Wait for DNS propagation (may take a few minutes to several hours)
7. Once the GitHub Actions workflow runs successfully, the site will be available at `https://totp.starmaze.dev`

**Note:** These instructions will be removed once the initial setup is complete.
