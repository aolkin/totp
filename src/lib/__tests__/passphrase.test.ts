import { describe, it, expect } from 'vitest';
import {
  generatePassphrase,
  calculateStrength,
  getStrengthLabel,
  getStrengthColor,
} from '../passphrase';

describe('Passphrase', () => {
  describe('generatePassphrase', () => {
    it('should generate 5 words by default', () => {
      const passphrase = generatePassphrase();
      const words = passphrase.split('-');

      expect(words.length).toBe(5);
    });

    it('should generate specified number of words', () => {
      const passphrase3 = generatePassphrase(3);
      const passphrase7 = generatePassphrase(7);

      expect(passphrase3.split('-').length).toBe(3);
      expect(passphrase7.split('-').length).toBe(7);
    });

    it('should generate different passphrases each time', () => {
      const passphrase1 = generatePassphrase();
      const passphrase2 = generatePassphrase();

      expect(passphrase1).not.toBe(passphrase2);
    });

    it('should use hyphen as separator', () => {
      const passphrase = generatePassphrase();

      expect(passphrase).toContain('-');
      expect(passphrase).not.toContain(' ');
    });

    it('should only contain lowercase letters and hyphens', () => {
      const passphrase = generatePassphrase();

      expect(passphrase).toMatch(/^[a-z-]+$/);
    });
  });

  describe('calculateStrength', () => {
    it('should return 0 for empty string', () => {
      expect(calculateStrength('')).toBe(0);
    });

    it('should return low strength for short passwords', () => {
      expect(calculateStrength('short')).toBeLessThanOrEqual(2);
    });

    it('should return higher strength for longer passwords', () => {
      const shortStrength = calculateStrength('pass');
      const longStrength = calculateStrength('verylongpassword');

      expect(longStrength).toBeGreaterThan(shortStrength);
    });

    it('should return higher strength for mixed character types', () => {
      const lowercaseOnly = calculateStrength('password');
      const mixed = calculateStrength('Password123!');

      expect(mixed).toBeGreaterThan(lowercaseOnly);
    });

    it('should return max 4', () => {
      const strength = calculateStrength('VeryStrongPassword123!@#$%^&*()');

      expect(strength).toBeLessThanOrEqual(4);
    });
  });

  describe('getStrengthLabel', () => {
    it('should return "Very Weak" for strength 0', () => {
      expect(getStrengthLabel(0)).toBe('Very Weak');
    });

    it('should return "Weak" for strength 1', () => {
      expect(getStrengthLabel(1)).toBe('Weak');
    });

    it('should return "Fair" for strength 2', () => {
      expect(getStrengthLabel(2)).toBe('Fair');
    });

    it('should return "Good" for strength 3', () => {
      expect(getStrengthLabel(3)).toBe('Good');
    });

    it('should return "Strong" for strength 4', () => {
      expect(getStrengthLabel(4)).toBe('Strong');
    });

    it('should handle values above 4', () => {
      expect(getStrengthLabel(5)).toBe('Strong');
      expect(getStrengthLabel(10)).toBe('Strong');
    });
  });

  describe('getStrengthColor', () => {
    it('should return red for strength 0', () => {
      expect(getStrengthColor(0)).toBe('#dc3545');
    });

    it('should return orange for strength 1', () => {
      expect(getStrengthColor(1)).toBe('#fd7e14');
    });

    it('should return yellow for strength 2', () => {
      expect(getStrengthColor(2)).toBe('#ffc107');
    });

    it('should return teal for strength 3', () => {
      expect(getStrengthColor(3)).toBe('#20c997');
    });

    it('should return green for strength 4', () => {
      expect(getStrengthColor(4)).toBe('#28a745');
    });

    it('should handle values above 4', () => {
      expect(getStrengthColor(5)).toBe('#28a745');
      expect(getStrengthColor(10)).toBe('#28a745');
    });
  });
});
