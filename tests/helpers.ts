import { expect, type Page } from '@playwright/test';

/**
 * Helper to create a TOTP URL via the UI.
 * Fills in the form and returns the generated URL and passphrase.
 */
export async function createTotpUrl(
  page: Page,
  options: {
    secret?: string;
    label?: string;
    passphrase?: string;
  } = {},
): Promise<{ url: string; passphrase: string }> {
  const { secret = 'AAAABBBBCCCCDDDD', label, passphrase } = options;

  await page.goto('/#/');
  await page.getByRole('link', { name: 'Add New' }).click();
  await page.getByRole('textbox', { name: 'TOTP Secret' }).fill(secret);

  if (label) {
    await page.getByRole('textbox', { name: 'Label' }).fill(label);
  }

  // Get or set passphrase
  let finalPassphrase: string;
  if (passphrase !== undefined) {
    await page.getByRole('textbox', { name: 'Passphrase' }).fill(passphrase);
    finalPassphrase = passphrase;
  } else {
    finalPassphrase = await page.getByRole('textbox', { name: 'Passphrase' }).inputValue();
  }

  await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
  await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();

  const url = await page.getByRole('textbox', { name: 'Generated TOTP URL' }).inputValue();
  return { url, passphrase: finalPassphrase };
}

/**
 * Helper to save a TOTP to browser storage via the UI.
 */
export async function saveTotpToBrowser(
  page: Page,
  options: {
    secret?: string;
    label: string;
    passphrase: string;
    passphraseHint?: string;
  },
): Promise<void> {
  const { secret = 'AAAABBBBCCCCDDDD', label, passphrase, passphraseHint } = options;

  await page.goto('/#/');
  await page.getByRole('link', { name: 'Add New' }).click();
  await page.getByRole('textbox', { name: 'TOTP Secret' }).fill(secret);
  await page.getByRole('textbox', { name: 'Label' }).fill(label);

  await page.getByRole('checkbox', { name: 'Save to this browser' }).click();

  await page.locator('#passphrase').fill(passphrase);

  if (passphraseHint) {
    await page.getByRole('textbox', { name: 'Passphrase Hint' }).fill(passphraseHint);
  }

  await page.getByRole('button', { name: 'Generate TOTP URL' }).click();
  await expect(page.getByRole('heading', { name: 'URL Generated' })).toBeVisible();
  await page.getByRole('link', { name: 'View Saved TOTPs' }).click();
  await expect(page.getByRole('heading', { name: 'Saved TOTPs' })).toBeVisible();
}
