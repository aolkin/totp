import { describe, it, expect } from 'vitest';
import { parseOTPAuthURL } from '../otpauth';

// Test secrets use obvious patterns (AAAA, ABCD) to avoid triggering security scanners
// that might mistake them for real credentials.

describe('OTP Auth URL Parser', () => {
  it('should parse standard otpauth URL with all parameters and defaults', () => {
    const url =
      'otpauth://totp/Example:user@example.com?secret=AAAABBBBCCCCDDDD&issuer=Example&algorithm=SHA1&digits=6&period=30';
    const result = parseOTPAuthURL(url);

    expect(result.secret).toBe('AAAABBBBCCCCDDDD');
    expect(result.label).toBe('Example:user@example.com');
    expect(result.issuer).toBe('Example');
    expect(result.algorithm).toBe('SHA1');
    expect(result.digits).toBe(6);
    expect(result.period).toBe(30);

    // Verify defaults with minimal URL
    const minimal = parseOTPAuthURL('otpauth://totp/Service?secret=AAAA');
    expect(minimal.algorithm).toBe('SHA1');
    expect(minimal.digits).toBe(6);
    expect(minimal.period).toBe(30);
  });

  it.each([
    ['SHA256', 'otpauth://totp/S?secret=AAAA&algorithm=SHA256'],
    ['SHA512', 'otpauth://totp/S?secret=AAAA&algorithm=SHA512'],
    ['SHA256', 'otpauth://totp/S?secret=AAAA&algorithm=sha256'], // case-insensitive
  ])('should parse algorithm %s', (expected, url) => {
    expect(parseOTPAuthURL(url).algorithm).toBe(expected);
  });

  it('should normalize secret and handle URL-encoded labels', () => {
    expect(parseOTPAuthURL('otpauth://totp/S?secret=aaaa bbbb').secret).toBe('AAAABBBB');
    expect(
      parseOTPAuthURL('otpauth://totp/My%20Service%3A%20user%40example.com?secret=AAAA').label,
    ).toBe('My Service: user@example.com');
  });

  it.each([
    ['https://example.com/qr', 'expected otpauth:// protocol'],
    ['otpauth://hotp/S?secret=AAAA', 'only TOTP type is supported'],
    ['otpauth://totp/S', 'missing required secret parameter'],
    ['otpauth://totp/S?secret=AAAA&algorithm=MD5', 'unsupported algorithm'],
    ['otpauth://totp/S?secret=AAAA&digits=5', 'digits must be 6, 7, or 8'],
    ['otpauth://totp/S?secret=AAAA&period=10', 'period must be between 15 and 120'],
    ['otpauth://totp/S?secret=INVALID189', 'secret is not valid Base32'],
  ])('should throw for invalid URL: %s', (url, expectedError) => {
    expect(() => parseOTPAuthURL(url)).toThrow(expectedError);
  });
});
