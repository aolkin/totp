/**
 * Passphrase unit tests focus on our passphrase generation logic.
 * Simple lookup functions (getStrengthLabel, getStrengthColor) are tested
 * via E2E tests of the strength indicator UI.
 */
import { describe, it, expect } from 'vitest';
import { generatePassphrase } from '../passphrase';

describe('Passphrase', () => {
  describe('generatePassphrase', () => {
    it('should generate 5 hyphen-separated lowercase words by default', () => {
      const passphrase = generatePassphrase();

      expect(passphrase.split('-').length).toBe(5);
      expect(passphrase).toMatch(/^[a-z-]+$/);
      expect(passphrase).not.toContain(' ');
    });

    it.each([3, 5, 7])('should generate %d words when specified', (count) => {
      expect(generatePassphrase(count).split('-').length).toBe(count);
    });

    it('should generate different passphrases each time', () => {
      expect(generatePassphrase()).not.toBe(generatePassphrase());
    });
  });
});
