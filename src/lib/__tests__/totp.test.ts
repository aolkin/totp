import { describe, it, expect } from 'vitest';
import { generateTOTPCode, getTimeRemaining } from '../totp';
import type { TOTPConfig } from '../types';

describe('TOTP Generation', () => {
  describe('Code generation for different algorithms', () => {
    it.each(['SHA1', 'SHA256', 'SHA512'] as const)(
      'should generate valid 6-digit code for %s',
      (algorithm) => {
        const config: TOTPConfig = {
          secret: 'GEZDGNBVGY3TQOJQ',
          label: '',
          digits: 6,
          period: 30,
          algorithm,
        };

        const code = generateTOTPCode(config);
        expect(code).toMatch(/^\d{6}$/);
      },
    );
  });

  describe('Different digit counts', () => {
    it.each([6, 7, 8])('should generate %d-digit codes', (digits) => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits,
        period: 30,
        algorithm: 'SHA1',
      };

      const code = generateTOTPCode(config);
      expect(code).toMatch(new RegExp(`^\\d{${String(digits)}}$`));
    });
  });

  describe('Time remaining calculation', () => {
    it.each([15, 30, 60])('should return value between 1 and %d for period %d', (period) => {
      const remaining = getTimeRemaining(period);

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(period);
    });
  });

  describe('Code behavior', () => {
    it('should generate consistent codes within same time period', () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      expect(generateTOTPCode(config)).toBe(generateTOTPCode(config));
    });

    it('should generate different codes for different secrets', () => {
      const baseConfig = { label: '', digits: 6, period: 30, algorithm: 'SHA1' as const };

      const code1 = generateTOTPCode({ ...baseConfig, secret: 'JBSWY3DPEHPK3PXP' });
      const code2 = generateTOTPCode({ ...baseConfig, secret: 'ABCDEFGHIJKLMNOP' });

      expect(code1).not.toBe(code2);
    });
  });
});
