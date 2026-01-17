const WORD_LIST = [
  'apple', 'banana', 'cherry', 'delta', 'eagle', 'forest', 'garden', 'harbor',
  'island', 'jungle', 'kernel', 'lemon', 'mountain', 'novel', 'ocean', 'piano',
  'quartz', 'river', 'sunset', 'tower', 'umbrella', 'valley', 'window', 'yellow',
  'zebra', 'anchor', 'bridge', 'castle', 'dragon', 'ember', 'falcon', 'glacier',
  'helmet', 'ivory', 'jacket', 'kitten', 'lantern', 'marble', 'nectar', 'orange',
  'pepper', 'quiver', 'rocket', 'silver', 'timber', 'utopia', 'velvet', 'walnut',
  'xenon', 'yogurt', 'zephyr', 'arctic', 'bamboo', 'candle', 'desert', 'eclipse',
  'fabric', 'goblet', 'haven', 'indent', 'jasper', 'kettle', 'lotus', 'meadow',
  'nimbus', 'orchid', 'pebble', 'quinoa', 'rapids', 'sphere', 'temple', 'unity',
  'vertex', 'willow', 'xylose', 'yarrow', 'zenith', 'acorn', 'beacon', 'cipher',
  'dusk', 'envoy', 'fable', 'grove', 'haste', 'inlet', 'jewel', 'karma',
  'latch', 'mirth', 'nexus', 'oasis', 'plume', 'quest', 'ridge', 'spark',
  'trend', 'urban', 'vista', 'wager', 'yacht', 'zonal', 'atlas', 'blaze',
  'coral', 'drift', 'epoch', 'flora', 'glyph', 'heron', 'irony', 'joust',
  'knack', 'lunar', 'motto', 'noble', 'oxide', 'prism', 'quota', 'realm',
  'storm', 'triad', 'ultra', 'vigor', 'wheat', 'xerox', 'yield', 'zodiac'
];

export function generatePassphrase(wordCount: number = 5): string {
  const words: string[] = [];
  const randomValues = new Uint32Array(wordCount);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < wordCount; i++) {
    const index = randomValues[i] % WORD_LIST.length;
    words.push(WORD_LIST[index]);
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
