import { describe, it, expect } from 'vitest';
import { parseOTPAuthURL } from '../otpauth';

describe('OTP Auth URL Parser', () => {
  it('should parse standard otpauth URL with all parameters and defaults', () => {
    const url =
      'otpauth://totp/GitHub:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30';
    const result = parseOTPAuthURL(url);

    expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.label).toBe('GitHub:user@example.com');
    expect(result.issuer).toBe('GitHub');
    expect(result.algorithm).toBe('SHA1');
    expect(result.digits).toBe(6);
    expect(result.period).toBe(30);

    // Verify defaults with minimal URL
    const minimal = parseOTPAuthURL('otpauth://totp/Service?secret=ABC');
    expect(minimal.algorithm).toBe('SHA1');
    expect(minimal.digits).toBe(6);
    expect(minimal.period).toBe(30);
  });

  it.each([
    ['SHA256', 'otpauth://totp/S?secret=ABC&algorithm=SHA256'],
    ['SHA512', 'otpauth://totp/S?secret=ABC&algorithm=SHA512'],
    ['SHA256', 'otpauth://totp/S?secret=ABC&algorithm=sha256'], // case-insensitive
  ])('should parse algorithm %s', (expected, url) => {
    expect(parseOTPAuthURL(url).algorithm).toBe(expected);
  });

  it('should normalize secret and handle URL-encoded labels', () => {
    expect(parseOTPAuthURL('otpauth://totp/S?secret=abc def').secret).toBe('ABCDEF');
    expect(
      parseOTPAuthURL('otpauth://totp/My%20Service%3A%20user%40example.com?secret=ABC').label,
    ).toBe('My Service: user@example.com');
  });

  it.each([
    ['https://example.com/qr', 'expected otpauth:// protocol'],
    ['otpauth://hotp/S?secret=ABC', 'only TOTP type is supported'],
    ['otpauth://totp/S', 'missing required secret parameter'],
    ['otpauth://totp/S?secret=ABC&algorithm=MD5', 'unsupported algorithm'],
    ['otpauth://totp/S?secret=ABC&digits=5', 'digits must be 6, 7, or 8'],
    ['otpauth://totp/S?secret=ABC&period=10', 'period must be between 15 and 120'],
    ['otpauth://totp/S?secret=INVALID!@#', 'secret is not valid Base32'],
  ])('should throw for invalid URL: %s', (url, expectedError) => {
    expect(() => parseOTPAuthURL(url)).toThrow(expectedError);
  });
});
