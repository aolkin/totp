import { EFF_WORDLIST } from './eff-wordlist';

export function generatePassphrase(wordCount = 5): string {
  const words: string[] = [];
  const randomValues = new Uint32Array(wordCount);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < wordCount; i++) {
    const index = randomValues[i] % EFF_WORDLIST.length;
    words.push(EFF_WORDLIST[index]);
  }

  return words.join('-');
}

export function calculateStrength(text: string): number {
  if (!text) return 0;

  let score = 0;
  const length = text.length;

  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 20) score += 1;

  if (/[a-z]/.test(text)) score += 1;
  if (/[A-Z]/.test(text)) score += 1;
  if (/[0-9]/.test(text)) score += 1;
  if (/[^a-zA-Z0-9]/.test(text)) score += 1;

  return Math.min(Math.floor(score / 2), 4);
}

export function getStrengthLabel(strength: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[Math.min(strength, 4)];
}

export function getStrengthColor(strength: number): string {
  const colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#28a745'];
  return colors[Math.min(strength, 4)];
}
