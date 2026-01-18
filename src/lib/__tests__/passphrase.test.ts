import { describe, it, expect } from 'vitest';
import {
  generatePassphrase,
  calculateStrength,
  getStrengthLabel,
  getStrengthColor,
} from '../passphrase';

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

  describe('calculateStrength', () => {
    it('should return 0 for empty string', () => {
      expect(calculateStrength('')).toBe(0);
    });

    it('should increase strength with length and character variety', () => {
      const short = calculateStrength('pass');
      const longer = calculateStrength('verylongpassword');
      const mixed = calculateStrength('Password123!');

      expect(longer).toBeGreaterThan(short);
      expect(mixed).toBeGreaterThan(calculateStrength('password'));
    });

    it('should cap at maximum of 4', () => {
      expect(calculateStrength('VeryStrongPassword123!@#$%^&*()')).toBeLessThanOrEqual(4);
    });
  });

  describe('getStrengthLabel', () => {
    it.each([
      [0, 'Very Weak'],
      [1, 'Weak'],
      [2, 'Fair'],
      [3, 'Good'],
      [4, 'Strong'],
      [5, 'Strong'],
      [10, 'Strong'],
    ])('should return correct label for strength %d', (strength, expected) => {
      expect(getStrengthLabel(strength)).toBe(expected);
    });
  });

  describe('getStrengthColor', () => {
    it.each([
      [0, '#dc3545'],
      [1, '#fd7e14'],
      [2, '#ffc107'],
      [3, '#20c997'],
      [4, '#28a745'],
      [5, '#28a745'],
      [10, '#28a745'],
    ])('should return correct color for strength %d', (strength, expected) => {
      expect(getStrengthColor(strength)).toBe(expected);
    });
  });
});
