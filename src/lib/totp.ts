import { TOTP } from 'otpauth';
import type { TOTPConfig } from './types';

export function generateTOTPCode(config: TOTPConfig): string {
  const totp = new TOTP({
    secret: config.secret,
    digits: config.digits,
    period: config.period,
    algorithm: config.algorithm,
  });

  return totp.generate();
}

export function getTimeRemaining(period: number): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}
