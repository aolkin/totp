/**
 * TOTP unit tests focus on our code's integration with the otpauth library,
 * not on testing the library's core TOTP algorithm. High-value tests verify
 * that our code correctly passes configuration to the library and handles
 * edge cases in our own logic.
 */
import { describe, it, expect } from 'vitest';
import { getTimeRemaining } from '../totp';

describe('TOTP', () => {
  describe('getTimeRemaining', () => {
    it.each([15, 30, 60])('should return value between 1 and %d for period %d', (period) => {
      const remaining = getTimeRemaining(period);

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(period);
    });
  });
});
