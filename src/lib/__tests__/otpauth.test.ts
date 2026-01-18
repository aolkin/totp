import { describe, it, expect } from 'vitest';
import { parseOTPAuthURL } from '../otpauth';

describe('OTP Auth URL Parser', () => {
  describe('valid URLs', () => {
    it('should parse standard otpauth URL with all parameters', () => {
      const url =
        'otpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30';
      const result = parseOTPAuthURL(url);

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.label).toBe('GitHub:user@example.com');
      expect(result.issuer).toBe('GitHub');
      expect(result.algorithm).toBe('SHA1');
      expect(result.digits).toBe(6);
      expect(result.period).toBe(30);
    });

    it('should parse URL with minimal parameters (secret only)', () => {
      const url = 'otpauth://totp/MyService?secret=ABC';
      const result = parseOTPAuthURL(url);

      expect(result.secret).toBe('ABC');
      expect(result.label).toBe('MyService');
      expect(result.issuer).toBe('');
      expect(result.algorithm).toBe('SHA1');
      expect(result.digits).toBe(6);
      expect(result.period).toBe(30);
    });

    it('should parse URL with custom algorithm SHA256', () => {
      const url = 'otpauth://totp/Service?secret=ABC&algorithm=SHA256';
      const result = parseOTPAuthURL(url);

      expect(result.algorithm).toBe('SHA256');
    });

    it('should parse URL with custom algorithm SHA512', () => {
      const url = 'otpauth://totp/Service?secret=ABC&algorithm=SHA512';
      const result = parseOTPAuthURL(url);

      expect(result.algorithm).toBe('SHA512');
    });

    it('should parse URL with custom digits (8)', () => {
      const url = 'otpauth://totp/Service?secret=ABC&digits=8';
      const result = parseOTPAuthURL(url);

      expect(result.digits).toBe(8);
    });

    it('should parse URL with custom period (60)', () => {
      const url = 'otpauth://totp/Service?secret=ABC&period=60';
      const result = parseOTPAuthURL(url);

      expect(result.period).toBe(60);
    });

    it('should normalize secret to uppercase and remove spaces', () => {
      const url = 'otpauth://totp/Service?secret=abc def';
      const result = parseOTPAuthURL(url);

      expect(result.secret).toBe('ABCDEF');
    });

    it('should handle URL-encoded label', () => {
      const url = 'otpauth://totp/My%20Service%3A%20user%40example.com?secret=ABC';
      const result = parseOTPAuthURL(url);

      expect(result.label).toBe('My Service: user@example.com');
    });

    it('should handle case-insensitive algorithm parameter', () => {
      const url = 'otpauth://totp/Service?secret=ABC&algorithm=sha256';
      const result = parseOTPAuthURL(url);

      expect(result.algorithm).toBe('SHA256');
    });
  });

  describe('invalid URLs', () => {
    it('should throw for non-otpauth protocol', () => {
      const url = 'https://example.com/qr';
      expect(() => parseOTPAuthURL(url)).toThrow('expected otpauth:// protocol');
    });

    it('should throw for hotp type (only totp supported)', () => {
      const url = 'otpauth://hotp/Service?secret=ABC';
      expect(() => parseOTPAuthURL(url)).toThrow('only TOTP type is supported');
    });

    it('should throw for missing secret parameter', () => {
      const url = 'otpauth://totp/Service';
      expect(() => parseOTPAuthURL(url)).toThrow('missing required secret parameter');
    });

    it('should throw for unsupported algorithm', () => {
      const url = 'otpauth://totp/Service?secret=ABC&algorithm=MD5';
      expect(() => parseOTPAuthURL(url)).toThrow('unsupported algorithm');
    });

    it('should throw for invalid digits (less than 6)', () => {
      const url = 'otpauth://totp/Service?secret=ABC&digits=5';
      expect(() => parseOTPAuthURL(url)).toThrow('digits must be 6, 7, or 8');
    });

    it('should throw for invalid digits (greater than 8)', () => {
      const url = 'otpauth://totp/Service?secret=ABC&digits=9';
      expect(() => parseOTPAuthURL(url)).toThrow('digits must be 6, 7, or 8');
    });

    it('should throw for invalid period (less than 15)', () => {
      const url = 'otpauth://totp/Service?secret=ABC&period=10';
      expect(() => parseOTPAuthURL(url)).toThrow('period must be between 15 and 120 seconds');
    });

    it('should throw for invalid period (greater than 120)', () => {
      const url = 'otpauth://totp/Service?secret=ABC&period=150';
      expect(() => parseOTPAuthURL(url)).toThrow('period must be between 15 and 120 seconds');
    });

    it('should throw for malformed URL', () => {
      const url = 'not-a-valid-url';
      expect(() => parseOTPAuthURL(url)).toThrow();
    });
  });
});
