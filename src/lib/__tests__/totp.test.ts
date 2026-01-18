import { describe, it, expect } from 'vitest';
import { generateTOTPCode, getTimeRemaining } from '../totp';
import type { TOTPConfig } from '../types';

describe('TOTP Generation', () => {
  describe('Code generation', () => {
    it('should generate 6-digit code for SHA1', () => {
      const config: TOTPConfig = {
        secret: 'GEZDGNBVGY3TQOJQ',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const code = generateTOTPCode(config);

      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate 6-digit code for SHA256', () => {
      const config: TOTPConfig = {
        secret: 'GEZDGNBVGY3TQOJQ',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA256',
      };

      const code = generateTOTPCode(config);

      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate 6-digit code for SHA512', () => {
      const config: TOTPConfig = {
        secret: 'GEZDGNBVGY3TQOJQ',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA512',
      };

      const code = generateTOTPCode(config);

      expect(code).toMatch(/^\d{6}$/);
    });
  });

  describe('Different digit counts', () => {
    it('should generate 6-digit codes', () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const code = generateTOTPCode(config);

      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate 7-digit codes', () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 7,
        period: 30,
        algorithm: 'SHA1',
      };

      const code = generateTOTPCode(config);

      expect(code).toMatch(/^\d{7}$/);
    });

    it('should generate 8-digit codes', () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 8,
        period: 30,
        algorithm: 'SHA1',
      };

      const code = generateTOTPCode(config);

      expect(code).toMatch(/^\d{8}$/);
    });
  });

  describe('Time remaining calculation', () => {
    it('should calculate time remaining within period for 30 seconds', () => {
      const remaining = getTimeRemaining(30);

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(30);
    });

    it('should calculate time remaining within period for 60 seconds', () => {
      const remaining = getTimeRemaining(60);

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(60);
    });

    it('should calculate time remaining within period for 15 seconds', () => {
      const remaining = getTimeRemaining(15);

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(15);
    });
  });

  describe('Code consistency within time period', () => {
    it('should generate the same code within the same time period', () => {
      const config: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const code1 = generateTOTPCode(config);
      const code2 = generateTOTPCode(config);

      expect(code1).toBe(code2);
    });
  });

  describe('Different secrets produce different codes', () => {
    it('should generate different codes for different secrets', () => {
      const config1: TOTPConfig = {
        secret: 'JBSWY3DPEHPK3PXP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const config2: TOTPConfig = {
        secret: 'ABCDEFGHIJKLMNOP',
        label: '',
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      };

      const code1 = generateTOTPCode(config1);
      const code2 = generateTOTPCode(config2);

      expect(code1).not.toBe(code2);
    });
  });
});
