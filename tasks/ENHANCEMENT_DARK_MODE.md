# Dark Mode Enhancement

## Overview

Add dark mode support with automatic system preference detection and manual toggle, improving usability in low-light environments and reducing eye strain.

**Goals:**
- Auto-detect system dark mode preference
- Smooth transitions between modes
- Maintain WCAG AA contrast ratios

## Implementation Strategy

### 1. System Preference Detection

**Detect user's OS/browser preference:**
```javascript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

**Listen for system changes:**
```javascript
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', event => {
    if (!hasManualPreference()) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });
```

**Priority order:**
1. System preference
2. Default to light


### 4. Theme Application

**CSS Custom Properties approach:**

```css
:root {
  /* Light mode (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --accent-color: #0066cc;
  --success-color: #28a745;
  --error-color: #dc3545;
  --code-bg: #f8f9fa;
  --shadow: rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  /* Dark mode */
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
  --accent-color: #4d9fff;
  --success-color: #3fb950;
  --error-color: #f85149;
  --code-bg: #2d2d2d;
  --shadow: rgba(0, 0, 0, 0.3);
}
```

**Apply theme:**
```javascript
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
```

## Color Schemes

### Light Mode Palette

**Background:**
- Primary: `#ffffff` (white)
- Secondary: `#f5f5f5` (light gray)
- Tertiary: `#e8e8e8` (card backgrounds)

**Text:**
- Primary: `#1a1a1a` (near black, 16.5:1 contrast)
- Secondary: `#666666` (gray, 5.7:1 contrast)
- Tertiary: `#999999` (light gray, 3.4:1 contrast)

**Accent:**
- Primary: `#0066cc` (blue, 4.6:1 contrast)
- Hover: `#0052a3`
- Success: `#28a745` (green)
- Error: `#dc3545` (red)
- Warning: `#ffc107` (yellow)

**Borders:**
- Default: `#e0e0e0`
- Focus: `#0066cc`

### Dark Mode Palette

**Background:**
- Primary: `#1a1a1a` (near black)
- Secondary: `#2d2d2d` (dark gray)
- Tertiary: `#363636` (lighter gray)

**Text:**
- Primary: `#e0e0e0` (light gray, 12.6:1 contrast)
- Secondary: `#a0a0a0` (medium gray, 7.2:1 contrast)
- Tertiary: `#808080` (gray, 4.5:1 contrast)

**Accent:**
- Primary: `#4d9fff` (light blue, 6.4:1 contrast)
- Hover: `#6db3ff`
- Success: `#3fb950` (green)
- Error: `#f85149` (red)
- Warning: `#d29922` (yellow)

**Borders:**
- Default: `#404040`
- Focus: `#4d9fff`

**IMPORTANT:** All color combinations must meet WCAG AA standard (4.5:1 for normal text, 3:1 for large text).

### Special Element Colors

**TOTP Code Display:**
- Light: `#000000` on `#f8f9fa` (monospace, large)
- Dark: `#ffffff` on `#2d2d2d`

**Buttons:**
- Light primary: `#0066cc` bg, `#ffffff` text
- Dark primary: `#4d9fff` bg, `#000000` text
- Ensure 3:1 contrast minimum

**Input fields:**
- Light: `#ffffff` bg, `#1a1a1a` text, `#e0e0e0` border
- Dark: `#2d2d2d` bg, `#e0e0e0` text, `#404040` border
- Focus: accent color border

**Camera preview (Phase 3):**
- Light: `#000000` background
- Dark: `#000000` background (same, camera needs dark)

## Transition Animations

**Smooth color transitions:**
```css
* {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
}

/* Disable transitions on theme load to prevent flash */
.disable-transitions * {
  transition: none !important;
}
```

**Apply on load:**
```javascript
function initTheme() {
  document.body.classList.add('disable-transitions');
  
  // Apply theme
  applyTheme(getPreferredTheme());
  
  // Re-enable after a frame
  requestAnimationFrame(() => {
    document.body.classList.remove('disable-transitions');
  });
}
```

## Toggle UI Component

### Three-State Toggle

**HTML:**
```html
<div class="theme-toggle">
  <button data-theme-option="light" aria-label="Light mode">
    ☀️
  </button>
  <button data-theme-option="auto" aria-label="Auto (system)" class="active">
    🌓
  </button>
  <button data-theme-option="dark" aria-label="Dark mode">
    🌙
  </button>
</div>
```

**CSS:**
```css
.theme-toggle {
  display: flex;
  gap: 0.5rem;
  background: var(--bg-secondary);
  padding: 0.25rem;
  border-radius: 1rem;
}

.theme-toggle button {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0.75rem;
  font-size: 1.25rem;
  transition: background-color 0.2s;
}

.theme-toggle button.active {
  background: var(--bg-primary);
  box-shadow: 0 2px 4px var(--shadow);
}

.theme-toggle button:hover:not(.active) {
  background: var(--bg-tertiary);
}
```

**JavaScript:**
```javascript
document.querySelectorAll('[data-theme-option]').forEach(button => {
  button.addEventListener('click', () => {
    const option = button.dataset.themeOption;
    setThemePreference(option);
    updateToggleUI(option);
  });
});

function setThemePreference(option) {
  localStorage.setItem('theme', option);
  
  if (option === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  } else {
    applyTheme(option);
  }
}

function updateToggleUI(active) {
  document.querySelectorAll('[data-theme-option]').forEach(button => {
    button.classList.toggle('active', button.dataset.themeOption === active);
  });
}
```

### Simple Toggle Alternative

**Two-state (light/dark only):**
```html
<button class="theme-toggle-simple" aria-label="Toggle dark mode">
  <span class="icon-light">☀️</span>
  <span class="icon-dark">🌙</span>
</button>
```

Toggles between light and dark, ignoring system preference.

## PWA Manifest Update

**Add theme color:**
```json
{
  "name": "Stateless TOTP",
  "theme_color": "#0066cc",
  "theme_color_dark": "#4d9fff",
  "background_color": "#ffffff",
  "background_color_dark": "#1a1a1a"
}
```

**Note:** Not all browsers support dark mode manifest yet. Add meta tag:
```html
<meta name="theme-color" content="#0066cc" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#4d9fff" media="(prefers-color-scheme: dark)">
```

## Component-Specific Considerations

### Phase 1: TOTP View

**Code display:**
- Highest contrast possible
- Light: black on white
- Dark: white on dark gray (not pure black for reduced eye strain)

**Countdown timer:**
- Light: `#666666` (secondary text)
- Dark: `#a0a0a0`

**Progress bar:**
- Light: `#0066cc` filled, `#e0e0e0` background
- Dark: `#4d9fff` filled, `#404040` background

### Phase 2: List View

**Cards:**
- Light: `#ffffff` with `#e0e0e0` border
- Dark: `#2d2d2d` with `#404040` border

**Hover states:**
- Light: `#f8f9fa` background
- Dark: `#363636` background

**Delete confirmation modal:**
- Light: white background, semi-transparent overlay
- Dark: dark background, semi-transparent overlay

### Phase 3: Camera View

**Camera preview:**
- Always dark background (black)
- Light mode: white UI controls
- Dark mode: light gray UI controls
- Scanning reticle: accent color (bright)

## Accessibility

### Screen Readers

**Announce theme changes:**
```html
<div role="status" aria-live="polite" class="sr-only">
  Theme changed to dark mode
</div>
```

### Keyboard Navigation

**Focus indicators:**
- Light: `2px solid #0066cc`
- Dark: `2px solid #4d9fff`
- Higher contrast in dark mode for visibility

### High Contrast Mode

**Respect Windows High Contrast:**
```css
@media (prefers-contrast: high) {
  :root {
    --text-primary: #000000;
    --bg-primary: #ffffff;
    --border-color: #000000;
  }
  
  [data-theme="dark"] {
    --text-primary: #ffffff;
    --bg-primary: #000000;
    --border-color: #ffffff;
  }
}
```

### Reduced Motion

**Disable transitions if preferred:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
```

## Testing Requirements

### tests/dark-mode.spec.js

```javascript
test('detects system dark mode preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  
  const theme = await page.getAttribute('html', 'data-theme');
  expect(theme).toBe('dark');
});

test('manual toggle overrides system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  
  await page.click('[data-theme-option="light"]');
  
  const theme = await page.getAttribute('html', 'data-theme');
  expect(theme).toBe('light');
});

test('persists theme preference', async ({ page, context }) => {
  await page.goto('/');
  await page.click('[data-theme-option="dark"]');
  
  // Reload page
  await page.reload();
  
  const theme = await page.getAttribute('html', 'data-theme');
  expect(theme).toBe('dark');
});

test('all text meets contrast requirements', async ({ page }) => {
  await page.goto('/');
  
  // Check light mode
  const lightContrast = await checkContrastRatios(page);
  expect(lightContrast.minimum).toBeGreaterThanOrEqual(4.5);
  
  // Check dark mode
  await page.click('[data-theme-option="dark"]');
  const darkContrast = await checkContrastRatios(page);
  expect(darkContrast.minimum).toBeGreaterThanOrEqual(4.5);
});

test('smooth transition between themes', async ({ page }) => {
  await page.goto('/');
  
  const before = await page.evaluate(() => 
    getComputedStyle(document.body).backgroundColor
  );
  
  await page.click('[data-theme-option="dark"]');
  
  // Wait for transition
  await page.waitForTimeout(300);
  
  const after = await page.evaluate(() => 
    getComputedStyle(document.body).backgroundColor
  );
  
  expect(before).not.toBe(after);
});

test('TOTP code visible in both modes', async ({ page }) => {
  // Light mode
  await page.goto('/#test-fragment');
  const lightCode = await page.textContent('[data-testid="totp-code"]');
  expect(lightCode).toBeTruthy();
  
  // Dark mode
  await page.click('[data-theme-option="dark"]');
  const darkCode = await page.textContent('[data-testid="totp-code"]');
  expect(darkCode).toBeTruthy();
  expect(darkCode).toBe(lightCode);
});
```

### Visual Regression Tests

**Capture screenshots in both modes:**
```javascript
test('visual regression - create form', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('create-form-light.png');
  
  await page.click('[data-theme-option="dark"]');
  await expect(page).toHaveScreenshot('create-form-dark.png');
});
```

### Manual Testing Checklist

**Light Mode:**
- [ ] All text readable against backgrounds
- [ ] Buttons have clear hover states
- [ ] Form inputs visible and usable
- [ ] TOTP code highly visible
- [ ] Borders distinguish elements
- [ ] Focus indicators clear

**Dark Mode:**
- [ ] All text readable against dark backgrounds
- [ ] No pure black backgrounds (eye strain)
- [ ] Accent colors sufficiently bright
- [ ] Borders visible but not harsh
- [ ] Focus indicators clear
- [ ] Camera view usable (Phase 3)

**Transitions:**
- [ ] Smooth color transitions
- [ ] No flashing on page load
- [ ] No layout shift during toggle

**System Integration:**
- [ ] Follows system preference by default
- [ ] Manual toggle overrides system
- [ ] Preference persists across sessions
- [ ] Works in incognito mode

**Browsers:**
- [ ] Chrome (desktop/mobile)
- [ ] Firefox (desktop/mobile)
- [ ] Safari (macOS/iOS)
- [ ] Edge

## Performance Considerations

### CSS Size Impact

**Custom properties add minimal overhead:**
- ~2KB additional CSS
- No runtime performance impact
- Single repaint on theme change

### Preventing Flash of Unstyled Content

**Inline critical CSS:**
```html
<style>
  /* Inline theme variables to prevent flash */
  :root { /* light mode vars */ }
  [data-theme="dark"] { /* dark mode vars */ }
</style>

<script>
  // Apply theme before page renders
  (function() {
    const theme = localStorage.getItem('theme') || 'auto';
    if (theme === 'auto') {
      const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  })();
</script>
```

**Place in `<head>` before any content renders.**

## Success Criteria

Dark mode enhancement is complete when:
- [ ] System preference auto-detection works
- [ ] Manual three-state toggle functional
- [ ] Theme preference persists
- [ ] All WCAG AA contrast ratios met
- [ ] Smooth transitions between modes
- [ ] No flash on page load
- [ ] All Playwright tests pass
- [ ] Visual regression tests pass
- [ ] Works across all browsers
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] High contrast mode supported
- [ ] Reduced motion respected

## Future Enhancements

**Custom themes:**
- Allow users to pick accent colors
- Save multiple theme profiles
- Share theme presets

**Scheduled mode:**
- Auto-switch at sunset/sunrise
- Custom schedule (dark 8pm-6am)

**Per-TOTP themes:**
- Different color for each saved TOTP (Phase 2)
- Helps distinguish at a glance
