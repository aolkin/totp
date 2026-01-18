export interface OTPAuthData {
  label: string;
  secret: string;
  issuer: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
}

export function parseOTPAuthURL(url: string): OTPAuthData {
  const parsed = new URL(url);

  if (parsed.protocol !== 'otpauth:') {
    throw new Error('Invalid URL: expected otpauth:// protocol');
  }

  if (parsed.host !== 'totp') {
    throw new Error('Invalid URL: only TOTP type is supported');
  }

  const label = decodeURIComponent(parsed.pathname.slice(1));
  const params = parsed.searchParams;

  const secret = params.get('secret');
  if (!secret) {
    throw new Error('Invalid URL: missing required secret parameter');
  }

  const algorithmParam = params.get('algorithm')?.toUpperCase();
  let algorithm: OTPAuthData['algorithm'] = 'SHA1';
  if (algorithmParam === 'SHA256' || algorithmParam === 'SHA512') {
    algorithm = algorithmParam;
  } else if (algorithmParam && algorithmParam !== 'SHA1') {
    throw new Error(`Invalid URL: unsupported algorithm "${algorithmParam}"`);
  }

  const digitsParam = params.get('digits');
  let digits = 6;
  if (digitsParam) {
    const parsedDigits = parseInt(digitsParam, 10);
    if (isNaN(parsedDigits) || parsedDigits < 6 || parsedDigits > 8) {
      throw new Error('Invalid URL: digits must be 6, 7, or 8');
    }
    digits = parsedDigits;
  }

  const periodParam = params.get('period');
  let period = 30;
  if (periodParam) {
    const parsedPeriod = parseInt(periodParam, 10);
    if (isNaN(parsedPeriod) || parsedPeriod < 15 || parsedPeriod > 120) {
      throw new Error('Invalid URL: period must be between 15 and 120 seconds');
    }
    period = parsedPeriod;
  }

  return {
    label,
    secret: secret.toUpperCase().replace(/\s/g, ''),
    issuer: params.get('issuer') ?? '',
    algorithm,
    digits,
    period,
  };
}
